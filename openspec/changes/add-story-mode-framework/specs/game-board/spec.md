## MODIFIED Requirements
### Requirement: Board MUST include inactive squares
Squart SHALL generate a board for any width and height from 5 up to 20 inclusive and mark between 17% and 19% of its squares as inactive prior to the first turn, unless the player explicitly chooses a different percentage. When no integer count exists inside that range, the board MUST choose the nearest integer above 17%. The UI MUST expose sliders that let the player select independent horizontal and vertical dimensions (5–20) and an inactive percentage slider (0%–90%) plus a control to reset to the default 17–19% random behavior. The generator SHALL additionally prihvatiti opcionu layout masku (lista koordinata) i tretirati sve koordinate van maske kao trajno nedostupne: takve pozicije se ne prikazuju u 3D prikazu i ne broje se kao aktivna ni neaktivna polja.

#### Scenario: Minimum inactive count enforced
- **GIVEN** a 10x10 Squart board request
- **WHEN** the board is generated
- **THEN** at least 17 squares are marked inactive
- **AND** at most 19 squares are marked inactive

#### Scenario: Inactive squares blocked for both players
- **GIVEN** a generated Squart board with inactive squares
- **WHEN** either player attempts to place a domino covering an inactive square
- **THEN** the move is rejected as illegal

#### Scenario: Visual differentiation of inactive squares
- **GIVEN** the Three.js rendering of the board
- **WHEN** inactive squares are created
- **THEN** their material or color clearly differs from active squares

#### Scenario: Randomized but reproducible distribution
- **GIVEN** a request with a specific random seed
- **WHEN** the board is generated twice with the same seed
- **THEN** the same squares are marked inactive in both boards
- **AND** using a different seed yields a different inactive distribution

#### Scenario: Fallback when range is unattainable
- **GIVEN** a 5x5 Squart board request
- **WHEN** the board is generated
- **THEN** exactly 5 squares are marked inactive because no integer between 17% and 19% exists

#### Scenario: Player overrides inactive percentage
- **GIVEN** the player selects 40% on the inactive-percentage slider
- **WHEN** the board is regenerated
- **THEN** approximately 40% of squares are marked inactive (rounded to the nearest whole square)

#### Scenario: Player restores default distribution
- **GIVEN** the player has been using a custom inactive percentage
- **WHEN** the player activates the default inactive squares control
- **THEN** the next generated board uses a random inactive percentage between 17% and 19%

#### Scenario: Player selects rectangular board
- **GIVEN** the player sets the horizontal slider to 14 and the vertical slider to 8
- **WHEN** the board is regenerated
- **THEN** the resulting board contains 14 columns and 8 rows of squares

#### Scenario: Players place colored domino tokens
- **GIVEN** the player selects Horizontal orientation
- **WHEN** they place a valid domino on two adjacent squares
- **THEN** both squares become occupied and a blue domino token is rendered over them
- **AND** selecting Vertical orientation renders a red domino token over the two occupied squares

#### Scenario: Players alternate turns automatically
- **GIVEN** a new Squart game
- **WHEN** the horizontal player places a valid domino
- **THEN** the vertical player becomes the active player without manual mode switching

#### Scenario: Player without legal moves loses
- **GIVEN** it is Vertical's turn and no vertical domino placements remain
- **WHEN** the game state is evaluated
- **THEN** the game ends and Horizontal is declared the winner

#### Scenario: Layout mask excludes coordinates
- **GIVEN** a board generation request sa maskom koja isključuje koordinatu (2,2)
- **WHEN** tabla se generiše
- **THEN** pozicija (2,2) se ne prikazuje u rendereru i ne prihvata domino poteze

#### Scenario: Masked coordinates ignored in counts
- **GIVEN** layout maska definiše ukupno 60 koordina ta
- **WHEN** generator proračunava koliko polja treba da bude neaktivno
- **THEN** procenti se računaju na osnovu tih 60 polja, a ne celog pravougaonog rastera

