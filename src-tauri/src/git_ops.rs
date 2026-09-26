use crate::pty::{self, check_git_status, GitStatus};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn get_git_status(path: String) -> GitStatus {
    check_git_status(&path)
}

#[tauri::command]
pub fn git_stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    pty::git_stage_file(&repo_path, &file_path)
}

#[tauri::command]
pub fn git_unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    pty::git_unstage_file(&repo_path, &file_path)
}

#[tauri::command]
pub fn git_stage_all(repo_path: String) -> Result<(), String> {
    pty::git_stage_all(&repo_path)
}

#[tauri::command]
pub fn git_unstage_all(repo_path: String) -> Result<(), String> {
    pty::git_unstage_all(&repo_path)
}

#[tauri::command]
pub fn git_discard_file(repo_path: String, file_path: String) -> Result<(), String> {
    pty::git_discard_file(&repo_path, &file_path)
}

#[tauri::command]
pub fn git_commit(repo_path: String, message: String) -> Result<String, String> {
    pty::git_commit(&repo_path, &message)
}

#[tauri::command]
pub fn git_get_branches(repo_path: String) -> Result<Vec<String>, String> {
    pty::git_get_branches(&repo_path)
}

#[tauri::command]
pub fn git_checkout_branch(repo_path: String, branch: String) -> Result<String, String> {
    pty::git_checkout_branch(&repo_path, &branch)
}

#[tauri::command]
pub fn git_get_diff(
    repo_path: String,
    file_path: Option<String>,
    staged: bool,
) -> Result<String, String> {
    pty::git_get_diff(&repo_path, file_path.as_deref(), staged)
}

#[tauri::command]
pub async fn git_push(state: State<'_, AppState>, repo_path: String) -> Result<String, String> {
    let config = state.config_manager.load();
    let restrict = config.git.restrict_to_github;
    tokio::task::spawn_blocking(move || pty::git_push(&repo_path, restrict))
        .await
        .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn git_pull(state: State<'_, AppState>, repo_path: String) -> Result<String, String> {
    let config = state.config_manager.load();
    let restrict = config.git.restrict_to_github;
    tokio::task::spawn_blocking(move || pty::git_pull(&repo_path, restrict))
        .await
        .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn git_generate_commit_message(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let staged_diff = pty::git_get_diff(&repo_path, None, true).unwrap_or_default();
    let target_diff = if !staged_diff.trim().is_empty() {
        staged_diff
    } else {
        pty::git_get_diff(&repo_path, None, false).unwrap_or_default()
    };

    if target_diff.trim().is_empty() {
        return Err(
            "No staged, modified, or untracked changes found to generate commit message."
                .to_string(),
        );
    }

    let config = state.config_manager.load();
    state
        .ai_client
        .generate_commit_message(&target_diff, &config.ai)
        .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_git_repo_root_and_github_remotes() {
        let curr_dir = std::env::current_dir().unwrap();
        let root = pty::resolve_repo_root(&curr_dir.to_string_lossy());
        assert!(root.is_some(), "Current dir should be inside a git repo");

        let repo_root = root.unwrap();
        let (is_gh, blocked) = pty::inspect_github_remotes(&repo_root);
        assert!(is_gh, "Waddle remote should be recognized as GitHub");
        assert!(
            blocked.is_none(),
            "No non-GitHub remote should be blocked in Waddle"
        );

        let status = pty::check_git_status(&curr_dir.to_string_lossy());
        assert!(status.is_repo);
        assert!(status.is_github_repo);
    }

    #[test]
    fn test_git_push_pull_restrictions() {
        let temp_dir =
            std::env::temp_dir().join(format!("waddle_git_test_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let path_str = temp_dir.to_str().unwrap().to_string();

        let _ = std::process::Command::new("git")
            .args(["init"])
            .current_dir(&temp_dir)
            .output();

        let _ = std::process::Command::new("git")
            .args([
                "remote",
                "add",
                "origin",
                "https://gitlab.com/user/fake-repo.git",
            ])
            .current_dir(&temp_dir)
            .output();

        let push_res = pty::git_push(&path_str, true);
        assert!(
            push_res.is_err(),
            "Push to GitLab should be blocked when restrict_to_github is true"
        );
        assert!(push_res.unwrap_err().contains("GitHub限定ポリシー"));

        let pull_res = pty::git_pull(&path_str, true);
        assert!(
            pull_res.is_err(),
            "Pull from GitLab should be blocked when restrict_to_github is true"
        );
        assert!(pull_res.unwrap_err().contains("GitHub限定ポリシー"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_is_github_host_strict_domain_validation() {
        assert!(pty::is_github_host("git@github.com:wammed/Waddle.git"));
        assert!(pty::is_github_host("https://github.com/wammed/Waddle.git"));
        assert!(pty::is_github_host(
            "https://user:ghp_123456789@github.com/wammed/Waddle.git"
        ));
        assert!(pty::is_github_host(
            "https://gist.github.com/wammed/1234567.git"
        ));
        assert!(pty::is_github_host("https://wammed.github.io/blog.git"));
        assert!(pty::is_github_host(
            "ssh://git@github.com/wammed/Waddle.git"
        ));

        assert!(!pty::is_github_host(
            "https://attacker.com/wammed/github.com.git"
        ));
        assert!(!pty::is_github_host(
            "https://github.com.attacker.com/wammed/Waddle.git"
        ));
        assert!(!pty::is_github_host(
            "git@attacker.com:github.com/Waddle.git"
        ));
        assert!(!pty::is_github_host("https://gitlab.com/wammed/Waddle.git"));
        assert!(!pty::is_github_host(
            "https://bitbucket.org/wammed/Waddle.git"
        ));
        assert!(!pty::is_github_host(""));
        assert!(!pty::is_github_host("invalid-url"));
    }

    #[test]
    fn test_git_diff_clean_repo_empty() {
        let temp_dir =
            std::env::temp_dir().join(format!("waddle_git_clean_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let path_str = temp_dir.to_str().unwrap();

        let _ = std::process::Command::new("git")
            .args(["init"])
            .current_dir(&temp_dir)
            .output();

        let staged = pty::git_get_diff(path_str, None, true).unwrap_or_default();
        let unstaged = pty::git_get_diff(path_str, None, false).unwrap_or_default();
        assert!(staged.is_empty());
        assert!(unstaged.is_empty());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
