# Changelog

## [0.1.5]

### Added

- Investigator Creator UI

### Changed

- Replaced Background header with Investigator Creator 

## [0.1.4]

### Added

- Added a ProseMirror rich-text editor for `Description` and `Notes` on investigator and monster sheets
- Added a confirmation dialog before deleting items
- Added a new `spell` item type
- Added inline item description expansion in actor inventory rows by clicking item names with descriptions
- Added inventory sorting controls with `Default`, `Manual (DnD)`, `Name`, `Type`, `Slot size` and `Equipped` modes
- Added a `Generate Actor` sidebar button to create a new investigator with rolled stats, HP, cash, random backstory, and generated description, then post the result to chat
- Added an armor auto-calculation indicator with a tooltip on investigator and monster sheets

### Changed

- Increased actor sheet height for improved tab and editor spacing
- Updated the investigator sheet stat block
- Updated editor, scrollbar, log, and inventory sheet styling to better match the Liminal Horror sheet theme
- Allowed multiple equipped armor items to stack their armor values instead of forcing only one equipped armor item
- Migrated system to Foundry v14

### Fixed

- Restored proper armor recalculation after deleting equipped armor
- Fixed investigator and monster sheet rich-text editor rendering by using the stable appv1 editor pattern
- Reset `Damage` and `Stress` apply fields back to `1` after use
- Minor bug fixes

### Acknowledgments

- Thanks to Maia (my-ee-uh) for feedback

## [0.1.3]

### Added

- Added a system update modal with changelog history
- Added a setting to disable automatic armor calculation

### Changed

- Inverted the colors of the Hand icon
- Removed the monster stat cap of 18
- Limited chat messages to Investigator actors only
- Moved starter items to a compendium pack
- Reworked the monster character sheet

### Fixed

- Minor bug fixes

### Removed

- Removed the button for creating starter items

### Acknowledgments

- Thanks to Maia (my-ee-uh) for feedback

## [0.1.2]

### Added

- Appendix L: Luck (optional, requires enabling in settings)
- Updated UI (repositioned Rest and DIE buttons)

### Fixed

- Minor bug fixes

## [0.1.1]

### Added

- Migrated system to Foundry v13

### Fixed

- Resolved compatibility issues
- Minor bug fixes

## [0.1.0]

### Added

- Initial public alpha release.
- Investigator sheet with attributes, stress, inventory.
- Support for dice rolls and saves.
- GM tools for applying stress, injuries, and whisper rolls.
- Localization support (English, Українська).
