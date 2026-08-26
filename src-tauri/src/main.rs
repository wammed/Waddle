// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "linux")]
unsafe fn setup_linux_log_filters() {
    extern "C" {
        fn g_log_set_handler(
            log_domain: *const std::os::raw::c_char,
            log_levels: i32,
            log_func: Option<
                unsafe extern "C" fn(
                    *const std::os::raw::c_char,
                    i32,
                    *const std::os::raw::c_char,
                    *mut std::os::raw::c_void,
                ),
            >,
            user_data: *mut std::os::raw::c_void,
        ) -> u32;
    }

    unsafe extern "C" fn gdk_log_filter(
        log_domain: *const std::os::raw::c_char,
        _log_level: i32,
        message: *const std::os::raw::c_char,
        _user_data: *mut std::os::raw::c_void,
    ) {
        if !message.is_null() {
            let msg = std::ffi::CStr::from_ptr(message).to_string_lossy();
            // Filter out harmless GDK selection/clipboard broken pipe warnings on Wayland/X11
            if msg.contains("Error writing selection data")
                || msg.contains("Broken pipe")
                || msg.contains("Selection")
            {
                return;
            }
            let domain = if !log_domain.is_null() {
                std::ffi::CStr::from_ptr(log_domain)
                    .to_str()
                    .unwrap_or("Gdk")
            } else {
                "Gdk"
            };
            eprintln!("({}): {}", domain, msg);
        }
    }

    if let Ok(gdk_domain) = std::ffi::CString::new("Gdk") {
        // 0xFF: catch warning, critical, message, info, debug levels
        g_log_set_handler(
            gdk_domain.as_ptr(),
            0xFF,
            Some(gdk_log_filter),
            std::ptr::null_mut(),
        );
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        unsafe {
            setup_linux_log_filters();
        }
    }

    waddle_lib::run()
}
