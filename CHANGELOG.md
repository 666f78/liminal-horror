# Changelog

## [0.1.7]

### Added

- Added primary and offhand weapon assignment, with one-handed and two-handed weapons respecting hand occupancy on actor and item sheets
- Added automatic dual-wielding attacks from either equipped weapon, rolling both weapons and keeping the highest result
- Added GM world settings for offhand die reduction and a minimum die of 1d2 or 1d4, with reduction enabled and a 1d2 minimum by default
- Added independent spell equipping without occupying weapon hands
- Added compact 1H / 2H labels beside weapon names with localized handedness tooltips
- Added editable item images through Foundry's native image picker, available by clicking the image or using the keyboard

### Changed

- Aligned inventory values, equipment controls, and edit/delete actions in consistent columns on investigator and monster sheets
- Updated equipment chat cards with item- and hand-specific icons, paired hand icons for two-handed weapons, and distinct green/check and gray/minus equipped and unequipped states
- Simplified dual-wielding chat cards and displayed their formulas as `(1d4, 1d4)kh` while preserving native roll calculations and expandable dice results
- Highlighted weapon damage totals in muted red
- Localized weapon handedness, hand selection, dual-wielding labels, and related settings in English and Ukrainian
- Redesigned item sheets with an image and name header, compact parameter grids, grouped price and inventory slots, and a full-width description while preserving the existing palette and styling
- Combined equipment changes into one chat message per action, listing removed items before equipped items with their individual icons and state colors
- Kept ordinary weapon edits silent in chat when equipment state, hand assignment, and handedness remain unchanged

### Fixed

- Blocked weapon and spell attacks while unequipped, with disabled inventory controls and validation for macro/API calls
- Fixed automatically unequipped weapons missing from replacement notifications, reporting only successfully updated items in the combined message
- Fixed empty weapon and spell damage fields disappearing from item sheets
- Fixed Handlebars attributes and selected options that caused Prettier's template parser to fail

### Removed

- Removed the startup "Liminal Horror ready" notification

## [0.1.6]

### Added

- Added a support link for users who want to support continued development of the system
- Added an inline undo action to refund spent Luck and restore the original roll result
- Added a GM-only Party Overview window with HP, attributes, optional Luck, inventory slots, and character statuses
- Added persistent manual party selection shared between GMs, live updates, and quick access to character sheets
- Added compact status badges with icons and overflow tooltips that adapt to available space

### Changed

- Updated roll card styling and outcome colors
- Updated Voidcrawl roll cards with event colors, icons, and improved text readability
- Unified damage, stress, rest, status, item, and overload chat messages with the new roll card styling
- Updated weapon, spell, initiative, and backstory rolls to use consistent result cards
- Reworked generated investigator and system update chat messages with clearer headings, icons, and readable details
- Localized initiative and system update chat labels in English and Ukrainian
- Updated Luck spending to show success and the spent amount on the original roll card instead of posting a separate chat message
- Localized Luck spending and undo controls and messages in English and Ukrainian
- Localized Party Overview controls, status tooltips, and messages in English and Ukrainian
- Localized system settings, sidebar controls, support links, update dialogs, and notifications in English and Ukrainian
- Localized actor and item sheet tooltips, placeholders, field labels, sheet names, and actor and item types
- Localized the item compendium label and remaining chat result labels

### Fixed

- Fixed injury and consequence actions remaining available after Luck turns a failed roll into a success
- Fixed inconsistent Ukrainian Deprived and equipment labels
- Fixed duplicate Deprived status messages during concurrent inventory overload updates
- Minor bug fixes

### Acknowledgments

- Thanks to Viktor "Korpuskul" Solopenko
- Thanks to Maia (my-ee-uh)

## [0.1.5]

### Added

- Added an Investigator Generator sheet tool for rolling investigator attributes, HP, cash, descriptive details, first contact with the unknown, and backstory
- Added one-time attribute swapping after rolling investigator attributes
- Added one-time individual attribute rolls in Investigator Generator, with the main roll button filling only missing values
- Added a system setting to allow player rerolls in Investigator Generator while always allowing GM rerolls
- Added a GM-only Investigator Generator control to reset player attribute roll locks
- Added live refresh for open Investigator Generator windows when attribute roll locks are reset
- Allowed GMs to repeat Investigator Generator attribute swaps while keeping player swaps one-time
- Added backstory item previews and automatic backstory item creation from the Investigator Generator
- Added a shared investigator generation helper so the sidebar generator and Investigator Generator use the same roll and description logic
- Added a `Roll Details` action to roll all investigator descriptive details at once
- Added right-click restoration for gear uses in actor inventory rows, capped by the item's maximum uses
- Added public chat messages when discarding items or removing injuries, consequences, and conditions

### Changed

- Migrated actor and item sheets to Foundry ApplicationV2 sheet APIs
- Migrated system dialogs to Foundry DialogV2
- Made Investigator Generator available to players from investigator sheets
- Allowed players to edit and delete items, injuries, consequences, and conditions on actor sheets they own
- Renamed Investigator Creator to Investigator Generator across UI labels, localization keys, file names, and class names
- Reworked item sheet layout and styling for the new ApplicationV2 sheet shell
- Updated injury, consequence, investigator picker, item delete confirmation, update notice, and attribute swap dialogs to match the system sheet styling
- Reworked the Investigator Generator layout and styling to better match the actor sheet
- Removed numeric prefixes from Investigator Generator background dropdown options
- Improved Ukrainian translations for the Investigator Generator and related dialog labels
- Removed trailing periods from generated Ideology, Aesthetics, and First Encounter detail results
- Localized actor sheet header controls, inventory edit/delete tooltips, item delete confirmation, scene control labels, and investigator picker dialogs
- Improved generated investigator descriptions so only changed generated fields are updated instead of replacing unrelated description content
- Hid and skipped Luck rolls in investigator generation when Appendix L: Luck is disabled
- Standardized several shared CSS variables and dialog control styles

### Fixed

- Fixed item sheet checkbox styling to match the actor sheet Deprived checkbox
- Fixed gear use and restoration changes to post public chat messages
- Fixed HP loss chat cards using the wrong visibility mode by honoring Foundry v14 message mode
- Fixed Deprived status change messages being sent as GM whispers when the roll mode was not public
- Fixed remaining hardcoded English labels in Investigator Generator, item deletion, update notice, and GM scene-control dialogs

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
