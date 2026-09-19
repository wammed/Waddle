//! CommandPolicy Attack & False-Positive Verification Corpus
//! Exhaustive test matrix verifying Tier 3 (Block), Tier 2 (Review), and Tier 1 (Safe)
//! across 75+ test vectors covering indirect execution, dynamic eval, process substitutions,
//! privilege elevation, obfuscation, and developer safe-ops.

use waddle_lib::command_policy::{CommandPolicy, PolicyAction};

#[derive(Debug)]
struct PolicyTestCase<'a> {
    category: &'a str,
    command: &'a str,
    expected_action: PolicyAction,
    description: &'a str,
}

#[test]
fn test_command_policy_exhaustive_corpus() {
    let corpus = [
        // ====================================================================
        // Category 1: Shell Indirect Execution Bypass (Must be Review or Block)
        // ====================================================================
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "sh -c 'ls -la'",
            expected_action: PolicyAction::Review,
            description: "sh -c single quotes indirect execution",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "sh -c \"cat /etc/passwd\"",
            expected_action: PolicyAction::Review,
            description: "sh -c double quotes read",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "bash -c 'whoami'",
            expected_action: PolicyAction::Review,
            description: "bash -c user enumeration",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "bash -lc 'id'",
            expected_action: PolicyAction::Review,
            description: "bash login shell indirect flag (-lc)",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "zsh -c 'uptime'",
            expected_action: PolicyAction::Review,
            description: "zsh -c system uptime",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "dash -c 'date'",
            expected_action: PolicyAction::Review,
            description: "dash -c date execution",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "ksh -c 'pwd'",
            expected_action: PolicyAction::Review,
            description: "ksh -c working directory check",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "/bin/sh -c 'echo attack'",
            expected_action: PolicyAction::Review,
            description: "Full path /bin/sh -c indirect call",
        },
        PolicyTestCase {
            category: "Shell Indirect Execution",
            command: "/bin/bash -c 'uname -a'",
            expected_action: PolicyAction::Review,
            description: "Full path /bin/bash -c indirect call",
        },

        // ====================================================================
        // Category 2: Interpreter Dynamic Inline Evaluation (Review or Block)
        // ====================================================================
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "python -c 'print(1)'",
            expected_action: PolicyAction::Review,
            description: "python -c inline eval",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "python3 -c 'import os; print(os.getpid())'",
            expected_action: PolicyAction::Review,
            description: "python3 -c process inspection",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "node -e 'console.log(process.version)'",
            expected_action: PolicyAction::Review,
            description: "node -e nodejs inline eval",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "nodejs -e 'console.log(1)'",
            expected_action: PolicyAction::Review,
            description: "nodejs -e alias eval",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "node --eval 'console.log(2)'",
            expected_action: PolicyAction::Review,
            description: "node --eval long option flag",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "ruby -e 'puts 42'",
            expected_action: PolicyAction::Review,
            description: "ruby -e inline execution",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "perl -e 'print \"hi\\n\"'",
            expected_action: PolicyAction::Review,
            description: "perl -e inline execution",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "php -r 'echo 123;'",
            expected_action: PolicyAction::Review,
            description: "php -r inline eval",
        },
        PolicyTestCase {
            category: "Interpreter Dynamic Eval",
            command: "lua -e 'print(\"lua\")'",
            expected_action: PolicyAction::Review,
            description: "lua -e inline execution",
        },

        // ====================================================================
        // Category 3: Pipe & Argument Passing Execution (Review or Block)
        // ====================================================================
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "echo 'ls' | sh",
            expected_action: PolicyAction::Review,
            description: "echo piped into sh",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "echo 'whoami' | bash",
            expected_action: PolicyAction::Review,
            description: "echo piped into bash",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "echo 'id' | zsh",
            expected_action: PolicyAction::Review,
            description: "echo piped into zsh",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "cat script.sh | sh",
            expected_action: PolicyAction::Review,
            description: "cat script piped to sh",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "printf 'pwd\\n' | bash",
            expected_action: PolicyAction::Review,
            description: "printf piped to bash",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "find . -exec ls -la {} +",
            expected_action: PolicyAction::Review,
            description: "find -exec arbitrary command invocation",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "find /tmp -exec rm {} \\;",
            expected_action: PolicyAction::Review,
            description: "find -exec rm recursive deletion",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "find . -execdir touch {} \\;",
            expected_action: PolicyAction::Review,
            description: "find -execdir invocation",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "find . -name '*.log' -delete",
            expected_action: PolicyAction::Review,
            description: "find -delete deletion",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "xargs ls",
            expected_action: PolicyAction::Review,
            description: "xargs execution wrapper",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "find . | xargs -I{} cat {}",
            expected_action: PolicyAction::Review,
            description: "find piped to xargs",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "env bash -c 'echo env_eval'",
            expected_action: PolicyAction::Review,
            description: "env executing subshell",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "env python3 -c 'print(1)'",
            expected_action: PolicyAction::Review,
            description: "env executing inline python",
        },
        PolicyTestCase {
            category: "Pipes & Arg Passing",
            command: "env -i sh -c 'id'",
            expected_action: PolicyAction::Review,
            description: "env sanitized subshell execution",
        },

        // ====================================================================
        // Category 4: Privilege Escalation & Impersonation (Review)
        // ====================================================================
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "sudo systemctl restart nginx",
            expected_action: PolicyAction::Review,
            description: "sudo privilege elevation",
        },
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "sudo apt update",
            expected_action: PolicyAction::Review,
            description: "sudo package update",
        },
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "sudo -i",
            expected_action: PolicyAction::Review,
            description: "sudo root interactive shell",
        },
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "doas pacman -Syu",
            expected_action: PolicyAction::Review,
            description: "doas BSD/Linux elevation",
        },
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "pkexec visudo",
            expected_action: PolicyAction::Review,
            description: "pkexec policykit elevation",
        },
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "pkexec /bin/bash",
            expected_action: PolicyAction::Review,
            description: "pkexec shell launch",
        },
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "su -",
            expected_action: PolicyAction::Review,
            description: "su switch user root",
        },
        PolicyTestCase {
            category: "Privilege Escalation",
            command: "su root",
            expected_action: PolicyAction::Review,
            description: "su target root explicitly",
        },

        // ====================================================================
        // Category 5: Command Substitution & Obfuscation (Review)
        // ====================================================================
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "eval \"$(echo ls)\"",
            expected_action: PolicyAction::Review,
            description: "eval subshell command substitution",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "eval 'echo $USER'",
            expected_action: PolicyAction::Review,
            description: "eval dynamic evaluation",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "echo $(whoami)",
            expected_action: PolicyAction::Review,
            description: "Command substitution $() in echo",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "ls $(pwd)",
            expected_action: PolicyAction::Review,
            description: "Command substitution $() in ls",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "cat $(find . -name secret.txt)",
            expected_action: PolicyAction::Review,
            description: "Command substitution with find",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "echo `uname -a`",
            expected_action: PolicyAction::Review,
            description: "Backtick command substitution",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "touch `date +%s`.txt",
            expected_action: PolicyAction::Review,
            description: "Backtick timestamp in filename",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "echo aGVsbG8= | base64 -d | sh",
            expected_action: PolicyAction::Review,
            description: "Base64 decode pipeline to sh",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "cat payload.b64 | base64 --decode | bash",
            expected_action: PolicyAction::Review,
            description: "Base64 decode pipeline to bash",
        },
        PolicyTestCase {
            category: "Substitution & Obfuscation",
            command: "base64 -d encoded.txt | python3",
            expected_action: PolicyAction::Review,
            description: "Base64 decode pipeline to python3",
        },

        // ====================================================================
        // Category 6: Irrevocable Destructive Attacks (Tier 3: Block)
        // ====================================================================
        PolicyTestCase {
            category: "Destructive Block",
            command: ":(){ :|:& };:",
            expected_action: PolicyAction::Block,
            description: "Classic shell fork bomb with spaces",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: ":(){:|:&};:",
            expected_action: PolicyAction::Block,
            description: "Compact shell fork bomb",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "rm -rf /",
            expected_action: PolicyAction::Block,
            description: "Recursive root filesystem removal",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "rm -fr /",
            expected_action: PolicyAction::Block,
            description: "Recursive root filesystem removal (-fr)",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "rm -rf /*",
            expected_action: PolicyAction::Block,
            description: "Wildcard root deletion",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "rm -rf ~",
            expected_action: PolicyAction::Block,
            description: "Home directory wipe via tilde",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "rm -rf $HOME",
            expected_action: PolicyAction::Block,
            description: "Home directory wipe via $HOME variable",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "rm -rf /boot",
            expected_action: PolicyAction::Block,
            description: "Boot partition deletion",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "rm -rf /etc",
            expected_action: PolicyAction::Block,
            description: "System configuration wipe",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "bash -c 'rm -rf /'",
            expected_action: PolicyAction::Block,
            description: "Nested root wipe inside bash -c",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "sh -c 'rm -rf /*'",
            expected_action: PolicyAction::Block,
            description: "Nested root wipe inside sh -c",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "sudo rm -rf /",
            expected_action: PolicyAction::Block,
            description: "Privileged root deletion",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "mkfs.ext4 /dev/sda1",
            expected_action: PolicyAction::Block,
            description: "Filesystem creation formatting /dev/sda1",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "wipefs -a /dev/nvme0n1",
            expected_action: PolicyAction::Block,
            description: "Wipe partition signatures",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "fdisk /dev/sda",
            expected_action: PolicyAction::Block,
            description: "Low-level disk partitioner",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "parted /dev/sdb",
            expected_action: PolicyAction::Block,
            description: "Direct partition modifier",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "dd if=/dev/zero of=/dev/sda bs=1M",
            expected_action: PolicyAction::Block,
            description: "Direct raw block device zero overwrite",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "dd if=/dev/urandom of=/dev/nvme0n1",
            expected_action: PolicyAction::Block,
            description: "Direct raw NVMe random overwrite",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "echo bad > /dev/sda",
            expected_action: PolicyAction::Block,
            description: "Direct redirection into block device",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "cat payload > /etc/shadow",
            expected_action: PolicyAction::Block,
            description: "Direct redirection overwriting /etc/shadow",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "echo bad > /boot/vmlinuz",
            expected_action: PolicyAction::Block,
            description: "Direct redirection overwriting kernel image",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "git clean -fdx",
            expected_action: PolicyAction::Block,
            description: "Irreversible git untracked & ignored purge",
        },
        PolicyTestCase {
            category: "Destructive Block",
            command: "python -c \"import shutil; shutil.rmtree('/')\"",
            expected_action: PolicyAction::Block,
            description: "Python shutil.rmtree targeting root",
        },

        // ====================================================================
        // Category 7: False Positive Prevention (Tier 1: Safe)
        // ====================================================================
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "cat /var/log/delete.log",
            expected_action: PolicyAction::Safe,
            description: "Viewing log file containing 'delete' in filename",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "grep \"format\" disk.txt",
            expected_action: PolicyAction::Safe,
            description: "Searching for 'format' string in harmless text file",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "echo \"rm -rf\"",
            expected_action: PolicyAction::Safe,
            description: "Printing 'rm -rf' text without subshell or pipe",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "echo 'rm -rf'",
            expected_action: PolicyAction::Safe,
            description: "Single-quoted echo of rm -rf",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "echo \"wipefs -a\"",
            expected_action: PolicyAction::Safe,
            description: "Printing disk tool name in echo string",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "cat src/main.rs",
            expected_action: PolicyAction::Safe,
            description: "Standard source file viewer",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "git status",
            expected_action: PolicyAction::Safe,
            description: "Git repository status inspection",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "git diff",
            expected_action: PolicyAction::Safe,
            description: "Git working tree difference",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "git diff --staged",
            expected_action: PolicyAction::Safe,
            description: "Git staged index difference",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "git log -n 10",
            expected_action: PolicyAction::Safe,
            description: "Git commit history viewing",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "git branch",
            expected_action: PolicyAction::Safe,
            description: "Git branch listing without deletion flag",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "npm run build",
            expected_action: PolicyAction::Safe,
            description: "NPM build script execution",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "npm run dev",
            expected_action: PolicyAction::Safe,
            description: "NPM dev server execution",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "npm test",
            expected_action: PolicyAction::Safe,
            description: "NPM test script execution",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "cargo test",
            expected_action: PolicyAction::Safe,
            description: "Cargo unit testing",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "cargo build",
            expected_action: PolicyAction::Safe,
            description: "Cargo build compilation",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "cargo check",
            expected_action: PolicyAction::Safe,
            description: "Cargo fast syntax/type verification",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "ls -la",
            expected_action: PolicyAction::Safe,
            description: "Detailed directory listing",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "pwd",
            expected_action: PolicyAction::Safe,
            description: "Print current working directory",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "whoami",
            expected_action: PolicyAction::Safe,
            description: "Print current logged in username",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "uname -a",
            expected_action: PolicyAction::Safe,
            description: "Print system and kernel info",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "date",
            expected_action: PolicyAction::Safe,
            description: "Print current system time and date",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "head -n 20 file.txt",
            expected_action: PolicyAction::Safe,
            description: "Read first lines of a file",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "tail -f /var/log/syslog",
            expected_action: PolicyAction::Safe,
            description: "Stream system log safely without redirect",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "echo 'Hello World'",
            expected_action: PolicyAction::Safe,
            description: "Benign greeting print",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "format_disk=true",
            expected_action: PolicyAction::Safe,
            description: "Harmless shell variable assignment",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "env",
            expected_action: PolicyAction::Safe,
            description: "Environment listing without sub-command",
        },
        PolicyTestCase {
            category: "False Positive Prevention",
            command: "printenv",
            expected_action: PolicyAction::Safe,
            description: "Print environment variables read-only",
        },
    ];

    assert!(
        corpus.len() >= 50,
        "Corpus must contain at least 50 test patterns, found {}",
        corpus.len()
    );

    let mut failed = 0;
    for (idx, tc) in corpus.iter().enumerate() {
        let eval = CommandPolicy::evaluate(tc.command);
        if eval.action != tc.expected_action {
            eprintln!(
                "❌ [Corpus #{}] FAILED: [{}] '{}' ({}) - Expected {:?}, got {:?} (reason: {})",
                idx + 1,
                tc.category,
                tc.command,
                tc.description,
                tc.expected_action,
                eval.action,
                eval.reason
            );
            failed += 1;
        }
    }

    assert_eq!(
        failed, 0,
        "Total {} corpus test cases failed out of {}",
        failed,
        corpus.len()
    );

    println!(
        "✅ CommandPolicy Corpus PASS: All {} attack/safe patterns verified successfully!",
        corpus.len()
    );
}
