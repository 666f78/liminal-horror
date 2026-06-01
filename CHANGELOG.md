# Changelog

## [0.1.5]

### Added

- Added an Investigator Creator sheet tool for rolling investigator attributes, HP, cash, descriptive details, first contact with the unknown, and backstory
- Added one-time attribute swapping after rolling investigator attributes
- Added backstory item previews and automatic backstory item creation from the Investigator Creator
- Added a shared investigator generation helper so the sidebar generator and Investigator Creator use the same roll and description logic
- Added a `Roll Details` action to roll all investigator descriptive details at once

### Changed

- Migrated system dialogs to Foundry DialogV2
- Updated injury, consequence, investigator picker, item delete confirmation, update notice, and attribute swap dialogs to match the system sheet styling
- Reworked the Investigator Creator layout and styling to better match the actor sheet
- Improved Ukrainian translations for the Investigator Creator and related dialog labels
- Localized actor sheet header controls, inventory edit/delete tooltips, item delete confirmation, scene control labels, and investigator picker dialogs
- Improved generated investigator descriptions so only changed generated fields are updated instead of replacing unrelated description content
- Hid and skipped Luck rolls in investigator generation when Appendix L: Luck is disabled
- Standardized several shared CSS variables and dialog control styles

### Fixed

- Fixed Deprived status change messages being sent as GM whispers when the roll mode was not public
- Fixed remaining hardcoded English labels in Investigator Creator, item deletion, update notice, and GM scene-control dialogs

### Acknowledgments

- Thanks to @CodaBool

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
