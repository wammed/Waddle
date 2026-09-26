use std::io::Read;

#[tauri::command]
pub async fn native_clipboard_write(text: String) -> Result<(), String> {
    if text.is_empty() {
        return Ok(());
    }

    #[allow(unused_assignments)]
    let mut any_success = false;

    // 1. Linux Wayland: offer all text MIME types (text/plain;charset=utf-8, UTF8_STRING, text/plain, TEXT, STRING)
    // This allows Firefox, VS Code (Electron), LibreOffice, and native Wayland/XWayland apps to paste seamlessly.
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WAYLAND_DISPLAY").is_ok() {
            let bytes = text.as_bytes().to_vec().into_boxed_slice();
            let sources = vec![
                wl_clipboard_rs::copy::MimeSource {
                    source: wl_clipboard_rs::copy::Source::Bytes(bytes.clone()),
                    mime_type: wl_clipboard_rs::copy::MimeType::Specific("text/plain;charset=utf-8".into()),
                },
                wl_clipboard_rs::copy::MimeSource {
                    source: wl_clipboard_rs::copy::Source::Bytes(bytes.clone()),
                    mime_type: wl_clipboard_rs::copy::MimeType::Specific("UTF8_STRING".into()),
                },
                wl_clipboard_rs::copy::MimeSource {
                    source: wl_clipboard_rs::copy::Source::Bytes(bytes.clone()),
                    mime_type: wl_clipboard_rs::copy::MimeType::Specific("text/plain".into()),
                },
                wl_clipboard_rs::copy::MimeSource {
                    source: wl_clipboard_rs::copy::Source::Bytes(bytes.clone()),
                    mime_type: wl_clipboard_rs::copy::MimeType::Specific("TEXT".into()),
                },
                wl_clipboard_rs::copy::MimeSource {
                    source: wl_clipboard_rs::copy::Source::Bytes(bytes),
                    mime_type: wl_clipboard_rs::copy::MimeType::Specific("STRING".into()),
                },
            ];

            let mut opts = wl_clipboard_rs::copy::Options::new();
            opts.clipboard(wl_clipboard_rs::copy::ClipboardType::Regular);
            if let Err(e) = opts.copy_multi(sources) {
                eprintln!("[Waddle Clipboard] wl-clipboard copy_multi failed: {:?}", e);
            }

        }

        // 2. GTK clipboard sync (Linux): also sets GTK/WebKit selection clipboard
        let text_clone = text.clone();
        gtk::glib::MainContext::default().invoke(move || {
            let clipboard = gtk::Clipboard::get(&gdk::SELECTION_CLIPBOARD);
            clipboard.set_text(&text_clone);
            clipboard.store();

            // Also sync primary selection (middle click paste on Linux)
            let primary = gtk::Clipboard::get(&gdk::SELECTION_PRIMARY);
            primary.set_text(&text_clone);
        });
        any_success = true;
    }


    // 3. Arboard fallback (cross-platform / X11)
    if let Ok(mut cb) = arboard::Clipboard::new() {
        if cb.set_text(text).is_ok() {
            any_success = true;
        }
    }

    if any_success {
        Ok(())
    } else {
        Err("Failed to write to any system clipboard".into())
    }
}

#[tauri::command]
pub async fn native_clipboard_read() -> Result<String, String> {
    // 1. Linux Wayland: read with text/plain;charset=utf-8 priority (supported by Firefox & VS Code)
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WAYLAND_DISPLAY").is_ok() {
            // Try with text priority
            if let Ok((mut pipe, _)) = wl_clipboard_rs::paste::get_contents(
                wl_clipboard_rs::paste::ClipboardType::Regular,
                wl_clipboard_rs::paste::Seat::Unspecified,
                wl_clipboard_rs::paste::MimeType::TextWithPriority("text/plain;charset=utf-8"),
            ) {
                let mut buf = Vec::new();
                if pipe.read_to_end(&mut buf).is_ok() {
                    if let Ok(s) = String::from_utf8(buf) {
                        if !s.is_empty() {
                            return Ok(s);
                        }
                    }
                }
            }

            // Also try any plain text
            if let Ok((mut pipe, _)) = wl_clipboard_rs::paste::get_contents(
                wl_clipboard_rs::paste::ClipboardType::Regular,
                wl_clipboard_rs::paste::Seat::Unspecified,
                wl_clipboard_rs::paste::MimeType::Text,
            ) {
                let mut buf = Vec::new();
                if pipe.read_to_end(&mut buf).is_ok() {
                    if let Ok(s) = String::from_utf8(buf) {
                        if !s.is_empty() {
                            return Ok(s);
                        }
                    }
                }
            }
        }

        // 2. GTK clipboard read on Linux (reads directly from GTK/WebKit)
        let (tx, rx) = tokio::sync::oneshot::channel::<Option<String>>();
        gtk::glib::MainContext::default().invoke(move || {
            let clipboard = gtk::Clipboard::get(&gdk::SELECTION_CLIPBOARD);
            let text = clipboard.wait_for_text().map(|s| s.to_string());
            let _ = tx.send(text);
        });

        if let Ok(Ok(Some(text))) = tokio::time::timeout(std::time::Duration::from_millis(500), rx).await {
            if !text.is_empty() {
                return Ok(text);
            }
        }
    }

    // 3. Arboard fallback (X11 / cross-platform)
    if let Ok(mut cb) = arboard::Clipboard::new() {
        if let Ok(text) = cb.get_text() {
            if !text.is_empty() {
                return Ok(text);
            }
        }
    }

    Ok(String::new())
}
