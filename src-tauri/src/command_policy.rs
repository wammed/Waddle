use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PolicyAction {
    Safe,
    Review,
    Block,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CommandPolicyEvaluation {
    pub action: PolicyAction,
    pub reason: String,
    pub matched_pattern: Option<String>,
}

pub struct CommandPolicy;

impl CommandPolicy {
    /// Evaluates an input command or data buffer according to the 3-tier security policy.
    pub fn evaluate(cmd: &str) -> CommandPolicyEvaluation {
        let trimmed = cmd.trim();
        if trimmed.is_empty() {
            return CommandPolicyEvaluation {
                action: PolicyAction::Safe,
                reason: "Empty input".to_string(),
                matched_pattern: None,
            };
        }

        let lower = trimmed.to_lowercase();

        // -------------------------------------------------------------
        // Tier 3: PolicyAction::Block (Irrevocable destruction / catastrophic risk)
        // -------------------------------------------------------------

        // 1. Fork bomb patterns
        if lower.contains(":(){ :|:& };:") || lower.contains(":(){:|:&};:") || lower.contains(":(){:|:&}; :") {
            return CommandPolicyEvaluation {
                action: PolicyAction::Block,
                reason: "Irrevocable destructive operation: Shell fork bomb detected".to_string(),
                matched_pattern: Some("fork_bomb".to_string()),
            };
        }

        // 2. Destructive raw disk / partition operations
        let block_disk_tools = [
            "wipefs", "fdisk", "gdisk", "parted", "mkfs", "mkswap", "cryptsetup",
        ];
        for tool in &block_disk_tools {
            if matches_word_boundary(&lower, tool) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Block,
                    reason: format!("Irrevocable destructive operation: Disk manipulation utility '{}' blocked", tool),
                    matched_pattern: Some(tool.to_string()),
                };
            }
        }

        // 3. Raw dd writes to disk/device or device reading
        if lower.contains("dd if=") && (lower.contains("of=/dev/") || lower.contains("of=/dev/sd") || lower.contains("of=/dev/nvme") || lower.contains("of=/dev/null") || !lower.contains("of=")) {
            return CommandPolicyEvaluation {
                action: PolicyAction::Block,
                reason: "Irrevocable destructive operation: Direct disk block device overwrite via dd".to_string(),
                matched_pattern: Some("dd if=".to_string()),
            };
        }
        if lower.starts_with("dd ") && lower.contains("of=/dev/") {
            return CommandPolicyEvaluation {
                action: PolicyAction::Block,
                reason: "Irrevocable destructive operation: Overwriting block device via dd".to_string(),
                matched_pattern: Some("dd of=/dev/".to_string()),
            };
        }

        // 4. Critical root / partition file removals (rm -rf / or equivalents)
        let destructive_rm_targets = [
            "/", "/*", "/boot", "/boot/*", "/etc", "/etc/*", "/dev", "/dev/*",
            "/sys", "/sys/*", "/proc", "/proc/*", "~", "~/*", "$home", "$home/*",
        ];
        let has_rm_flags = lower.contains("rm -rf")
            || lower.contains("rm -fr")
            || lower.contains("rm -r -f")
            || lower.contains("rm -f -r")
            || lower.contains("rm --recursive --force");

        if has_rm_flags {
            for target in &destructive_rm_targets {
                let pattern_space = format!(" {}", target);
                let pattern_eq = format!("={}", target);
                if lower.ends_with(&pattern_space)
                    || lower.contains(&format!("{} ", pattern_space))
                    || lower.contains(&format!("{}\t", pattern_space))
                    || lower.contains(&pattern_eq)
                {
                    return CommandPolicyEvaluation {
                        action: PolicyAction::Block,
                        reason: format!("Irrevocable destructive operation: Catastrophic root/system recursive deletion targeting '{}'", target),
                        matched_pattern: Some(format!("rm -rf {}", target)),
                    };
                }
            }
        }

        // 5. Destructive redirection into system devices/directories
        let dangerous_redirections = [
            "> /dev/", ">> /dev/", ">/dev/",
            "> /etc/", ">> /etc/", ">/etc/",
            "> /boot/", ">> /boot/", ">/boot/",
            "> /sys/", ">> /sys/", ">/sys/",
            "> /proc/", ">> /proc/", ">/proc/",
        ];
        for redir in &dangerous_redirections {
            if lower.contains(redir) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Block,
                    reason: format!("Irrevocable destructive operation: Direct redirection to system directory/device '{}'", redir),
                    matched_pattern: Some(redir.to_string()),
                };
            }
        }

        // 6. Python shutil.rmtree targeting root or recursive
        if lower.contains("shutil.rmtree") && (lower.contains("'/'") || lower.contains("\"/\"")) {
            return CommandPolicyEvaluation {
                action: PolicyAction::Block,
                reason: "Irrevocable destructive operation: Python shutil.rmtree targeting root".to_string(),
                matched_pattern: Some("shutil.rmtree('/')".to_string()),
            };
        }

        // 7. Catastrophic Git repository destruction
        if lower.contains("git clean") && (lower.contains("-fdx") || lower.contains("-xdf")) {
            return CommandPolicyEvaluation {
                action: PolicyAction::Block,
                reason: "Irrevocable destructive operation: Irreversible git repository clean (untracked & ignored files)".to_string(),
                matched_pattern: Some("git clean -fdx".to_string()),
            };
        }

        // -------------------------------------------------------------
        // Tier 2: PolicyAction::Review (Privilege, environment changes, installations, general deletes)
        // -------------------------------------------------------------

        // 1. Privilege escalation
        let priv_keywords = ["sudo", "su", "pkexec", "doas"];
        for kw in &priv_keywords {
            if matches_word_boundary(&lower, kw) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Review,
                    reason: format!("Privilege elevation required via '{}'", kw),
                    matched_pattern: Some(kw.to_string()),
                };
            }
        }

        // 2. Package management and global installs
        let package_managers = [
            "npm install", "npm i ", "yarn add", "pnpm add", "pip install",
            "cargo install", "apt install", "apt-get install", "pacman -s",
            "dnf install", "yum install", "brew install", "flatpak install",
            "snap install",
        ];
        for pm in &package_managers {
            if lower.contains(pm) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Review,
                    reason: format!("Environment package installation or modification via '{}'", pm),
                    matched_pattern: Some(pm.to_string()),
                };
            }
        }

        // 3. Piped remote execution & process substitutions
        let piped_executions = [
            "| sh", "| bash", "| zsh", "| python", "| python3", "| perl", "| ruby",
            "bash <(", "sh <(", "zsh <(", "python <(", "python3 <(", "eval \"$(",
        ];
        for pipe in &piped_executions {
            if lower.contains(pipe) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Review,
                    reason: format!("Unverified remote code execution or process substitution via '{}'", pipe),
                    matched_pattern: Some(pipe.to_string()),
                };
            }
        }
        if (lower.contains("curl ") || lower.contains("wget ")) && (lower.contains("|") || lower.contains("eval")) {
            return CommandPolicyEvaluation {
                action: PolicyAction::Review,
                reason: "Remote script download and execution pattern (curl/wget | ...)".to_string(),
                matched_pattern: Some("curl/wget pipe".to_string()),
            };
        }

        // 4. Permission & firewall mutations
        let permission_patterns = [
            "chmod -r", "chmod 777", "chmod 755", "chmod +x", "chown -r", "chown ",
            "iptables", "ufw disable", "firewalld",
        ];
        for perm in &permission_patterns {
            if lower.contains(perm) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Review,
                    reason: format!("System permission, ownership, or firewall rule alteration via '{}'", perm),
                    matched_pattern: Some(perm.to_string()),
                };
            }
        }

        // 5. General file deletions, resets, and force pushes
        let general_delete_patterns = [
            "rm -", "rm ", "rm\t", "rmdir", "shred", "truncate",
            "git reset --hard",
        ];
        for del in &general_delete_patterns {
            if lower.contains(del) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Review,
                    reason: format!("File deletion or git history reset via '{}'", del),
                    matched_pattern: Some(del.to_string()),
                };
            }
        }

        if lower.contains("git push")
            && (lower.contains("--force")
                || lower.contains(" -f")
                || lower.contains("--delete")
                || lower.contains(" :"))
        {
            return CommandPolicyEvaluation {
                action: PolicyAction::Review,
                reason: "Git remote history overwrite or branch deletion via push".to_string(),
                matched_pattern: Some("git push --force/--delete".to_string()),
            };
        }

        if lower.contains("git branch")
            && (lower.contains("-d") || lower.contains("-d") || lower.contains("--delete"))
        {
            return CommandPolicyEvaluation {
                action: PolicyAction::Review,
                reason: "Git branch deletion via branch -d/-D".to_string(),
                matched_pattern: Some("git branch -d".to_string()),
            };
        }

        // 6. Find delete actions
        if lower.contains("find ") && (lower.contains("-delete") || lower.contains("-exec rm")) {
            return CommandPolicyEvaluation {
                action: PolicyAction::Review,
                reason: "Recursive filesystem item removal via find".to_string(),
                matched_pattern: Some("find -delete/-exec rm".to_string()),
            };
        }

        // 7. System power states
        let power_cmds = ["reboot", "shutdown", "poweroff", "init 0", "init 6"];
        for pc in &power_cmds {
            if matches_word_boundary(&lower, pc) {
                return CommandPolicyEvaluation {
                    action: PolicyAction::Review,
                    reason: format!("System state change or power termination via '{}'", pc),
                    matched_pattern: Some(pc.to_string()),
                };
            }
        }

        // -------------------------------------------------------------
        // Tier 1: PolicyAction::Safe (Read-only, non-destructive, benign)
        // -------------------------------------------------------------
        CommandPolicyEvaluation {
            action: PolicyAction::Safe,
            reason: "Non-destructive or read-only operation permitted".to_string(),
            matched_pattern: None,
        }
    }
}

/// Matches a token against text enforcing non-alphanumeric, non-hyphen, non-underscore boundaries.
fn matches_word_boundary(text: &str, word: &str) -> bool {
    let mut start = 0;
    while let Some(pos) = text[start..].find(word) {
        let abs_pos = start + pos;
        let end_pos = abs_pos + word.len();

        let before_ok = if abs_pos == 0 {
            true
        } else {
            let prev = text[..abs_pos].chars().next_back().unwrap();
            !prev.is_alphanumeric() && prev != '_' && prev != '-'
        };

        let after_ok = if end_pos >= text.len() {
            true
        } else {
            let next = text[end_pos..].chars().next().unwrap();
            !next.is_alphanumeric() && next != '_' && next != '-'
        };

        if before_ok && after_ok {
            return true;
        }
        start = abs_pos + 1;
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_policy_action_safe() {
        let safe_cmds = [
            "ls -la",
            "pwd",
            "git status",
            "git diff",
            "git log -n 10",
            "cat src/main.rs",
            "head -n 20 file.txt",
            "tail -f /var/log/syslog",
            "echo 'Hello World'",
            "grep -rn 'pattern' .",
            "date",
            "whoami",
            "uname -a",
            "format_disk=true", // Variable assignment not word-boundary wipefs
        ];

        for cmd in safe_cmds {
            let eval = CommandPolicy::evaluate(cmd);
            assert_eq!(
                eval.action,
                PolicyAction::Safe,
                "Expected '{}' to be Safe, got {:?}",
                cmd,
                eval
            );
        }
    }

    #[test]
    fn test_policy_action_review() {
        let review_cmds = [
            "npm install lucide-react",
            "yarn add vite",
            "cargo install ripgrep",
            "pip install requests",
            "sudo systemctl restart nginx",
            "su -",
            "chmod 755 script.sh",
            "chown -R user:user /opt/app",
            "curl https://example.com/install.sh | bash",
            "wget -O- https://example.com | sh",
            "bash <(curl -s https://example.com)",
            "rm temporary_file.txt",
            "rm -f scratch.log",
            "git reset --hard HEAD~1",
            "git push origin main --force",
            "git branch -D feature/old",
            "find . -name '*.tmp' -delete",
            "shutdown -r now",
            "reboot",
        ];

        for cmd in review_cmds {
            let eval = CommandPolicy::evaluate(cmd);
            assert_eq!(
                eval.action,
                PolicyAction::Review,
                "Expected '{}' to be Review, got {:?}",
                cmd,
                eval
            );
        }
    }

    #[test]
    fn test_policy_action_block() {
        let block_cmds = [
            "rm -rf /",
            "rm -fr /",
            "rm -rf /*",
            "rm -rf ~",
            "rm -rf $HOME",
            ":(){ :|:& };:",
            ":(){:|:&};:",
            "mkfs.ext4 /dev/sda1",
            "wipefs -a /dev/nvme0n1",
            "fdisk /dev/sdb",
            "parted /dev/sda",
            "dd if=/dev/zero of=/dev/sda bs=1M",
            "dd if=/dev/urandom of=/dev/nvme0n1",
            "echo 1 > /dev/sda",
            "cat malicious > /etc/shadow",
            "echo bad > /boot/vmlinuz",
            "git clean -fdx",
            "python -c \"import shutil; shutil.rmtree('/')\"",
        ];

        for cmd in block_cmds {
            let eval = CommandPolicy::evaluate(cmd);
            assert_eq!(
                eval.action,
                PolicyAction::Block,
                "Expected '{}' to be Block, got {:?}",
                cmd,
                eval
            );
        }
    }
}
