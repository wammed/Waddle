# Icon Design & IP Compliance Due Diligence Record

<p align="center">
  <a href="docs/PORTAL.md">Documentation Portal</a> | <strong>English</strong> | <a href="IP_COMPLIANCE.ja.md">日本語</a>
</p>

This document records the provenance, design-review history, and IP due-diligence process for the **Waddle** application icon.

> **Scope:** This is a project provenance and due-diligence record. It is not a legal opinion, trademark clearance, or guarantee that no third-party rights are implicated.

## 1. Asset & Provenance

- **Application:** Waddle
- **Purpose:** Linux / COSMIC-oriented AI-integrated terminal emulator.
- **Generation method:** AI-assisted iterative image generation and background transparency processing using Google Gemini (retaining C2PA Content Credentials provenance records).
- **Current design language:** Retro-futuristic, clean CRT terminal monitor, squircle frame, horizontal scanlines, and glowing neon pulse signal.
- **Current visual concept:** A dark brick-red CRT squircle monitor frame encasing a dark display with subtle horizontal scanlines. A bold, glowing cyan-to-magenta digital pulse wave (representing signal/pulse) originates directly from the terminal command prompt (`>_`) and traverses across the screen.

## 2. Design Review History

### Initial concept

The initial Waddle icon combined a large W with a Linux Tux penguin and a lightning symbol.
The Gemini-assisted review identified a strong visual similarity between the W + Tux composition and WSL-related visual identity.

### Intermediate Revision (Geometric "W" Prompt)

The project removed Tux and adopted a geometric "W" monogram combined with the CLI prompt symbol `>` and a lightning bolt. However, to eliminate lettermark collisions within the terminal emulator space (such as WezTerm) and more intuitively symbolize terminal hardware roots, ultra-low latency PTY streaming, and local AI execution, a full conceptual redesign was initiated.

### Current Revision (CRT Screen × PTY Pulse Wave)

The project moved completely away from both character mascots (penguins) and typographic monograms, adopting an emblem representing terminal hardware and I/O pipelines:

- **Complete Elimination of Penguin / Character Mascots**: Eliminates any visual collision with existing OS or third-party mascots;
- **CRT Scanline Display**: Employs retro CRT scanlines representing terminal roots;
- **Prompt-Integrated Pulse Waveform**: A bold neon pulse waveform emerges directly from the `>_` prompt, symbolizing zero-latency PTY streaming and local AI inference;
- **Dark Brick-Red Frame**: Establishes a distinct color identity clearly differentiated from conventional blue, green, and black terminal app icons;
- **Isolated Squircle Format**: Harmonizes cleanly with Linux desktop environments (COSMIC / Wayland) app launchers and docks.

## 3. Similarity Review

| Reference | Observation | Project action |
| :--- | :--- | :--- |
| WSL / Windows Subsystem for Linux | Gemini identified a strong similarity in the earlier W + Tux composition. | Completely eliminated Tux and penguin motifs in favor of the CRT pulse design. |
| WezTerm / Alacritty / Kitty | Broad terminal emulator category. WezTerm (W initial), Alacritty (geometric A), Kitty (cat illustration). | Abandoned the "W" initial and animal mascots. Differentiated through a dark brick-red CRT monitor frame with scanlines and a `>_` pulse wave. |
| System Resource Monitors / Healthcare Tools (e.g., GNOME System Monitor) | Standalone pulse/ECG waves are common in monitoring and health applications. | Integrated a clear command-line prompt (`>_`) directly into the wave on a CRT scanline display, establishing unambiguous CLI developer-tool context. |

## 4. Current Design Rationale

The current icon reflects Waddle's architecture and core capabilities:

- **CRT Screen & Scanlines** → The essence and heritage of terminal emulators;
- **`>_` Prompt** → Command-line interface input;
- **Bold Neon Pulse Wave** → Zero-latency PTY output streaming and live local AI (Ollama) signals;
- **Dark Brick-Red Squircle Frame** → Robustness, private local sandbox boundaries, and a distinct visual identity among developer tools.

## 5. AI-Assisted Review Limitations

The Gemini conversation contains strong wording such as “zero risk,” “fully compatible,” and similar conclusions. Those statements are preserved as part of the historical source record but are not adopted here as legal conclusions.

The visual review was not a comprehensive trademark, copyright, design-right, or unfair-competition clearance. No claim is made that no third-party mark anywhere in the world is similar to the current design.

## 6. Record Keeping

The detailed Gemini conversation and provenance metadata (including C2PA records) are retained separately as underlying development records. For the comprehensive cross-application historical archive covering initial generation, similarity reviews, and design transitions across Fluffy, Waddle, Rooney, and Toodle, see [ICON_DESIGN_HISTORY.md](ICON_DESIGN_HISTORY.md).

This document is the concise public-facing record and should be updated if the icon changes materially.

## 7. Current Status

**Status:** The current icon replaces the earlier penguin and "W" monogram motifs with the dark brick-red CRT frame featuring scanlines and a prompt-integrated pulse wave (`>_`).

**Review date:** 2026-10-31