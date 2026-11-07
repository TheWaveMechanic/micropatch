# About this fork

Based on [micropatch](https://github.com/ignis32/micropatch) by Mikhail Penkin (ignis32), a web patchbook for MICRORACK modular synths. The original design and code are theirs.

## Added
- **Eurorack board**: the MICRORACK rack chassis, two stacked 830-hole boards with eight corner power slots.
- Modules can sit across a corner slot and its rail.
- Size slider (50–100%); the page shrinks with it.
- Dragged modules show at their landing spot, half transparent.
- Option/Alt-drag duplicates a placed module.
- **Save as PDF** in Patch Management, showing that it is working: boards, cables and labels as vector, module art as images, a small file.
- The current patch is kept in the browser and comes back when the page reopens; nothing leaves the computer.
- **Initialize Patch** in Patch Management starts over with one empty breadboard, after asking to confirm.
- Updated module art to match the current hardware: colored bottom bands, the "vca" label on the Mixer / VCA, top jacks standing clear of the board, and the MIDI module at its true 15-column width.

## Security
- Publishing workflow pinned to exact action versions, with least-privilege permissions.
- Dependencies pinned and checked against known vulnerabilities, with none known; unused developer tools removed.
- Content-Security-Policy limits the app to its own files.
- Loaded patch files cannot point the app at other files on the site.
- Module downloader accepts only safe names and paths, from microrack.org only, and cannot hang.
- Removed committed assistant settings that allowed unattended deletes and pushes.
- Main branch protected; no outside contributions.
