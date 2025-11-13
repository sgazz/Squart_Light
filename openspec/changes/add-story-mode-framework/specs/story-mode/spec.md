## ADDED Requirements
### Requirement: Story mode SHALL organize gameplay into cities and neighborhoods
The system SHALL provide a campaign structure composed of cities, where svaka city sadrži najmanje jedan kvart (neighborhood) koji predstavlja tablu igre. Svaki kvart mora imati jedinstveni identifikator, naziv i status osvajanja (npr. neosvojen, osvojen, u toku).

#### Scenario: City list rendered
- **WHEN** igrač otvori story mode panel
- **THEN** prikazuje se lista dostupnih gradova sa brojem ili statusom kvartova

#### Scenario: Neighborhood status persists
- **GIVEN** igrač osvoji kvart u gradu
- **WHEN** ponovo otvori story mode panel
- **THEN** taj kvart je obeležen kao osvojen (npr. zvezdicom) i ostaje takav i nakon restartovanja aplikacije

### Requirement: Story mode UI SHALL vizuelno mapirati kvartove
Za svaki grad, panel SHALL prikazati mapu ili stilizovan prikaz grada sa označenim kvartovima. Svaki kvart prikaže indikator progresa (zvezdice, ikone) i omogućava izbor misije.

#### Scenario: Neighborhood selection
- **WHEN** igrač klikne na označeni kvart na mapi grada
- **THEN** sistem prikazuje detalje misije i dozvoljava pokretanje te table

#### Scenario: Locked neighborhood feedback
- **GIVEN** kvart nije otključan jer prethodni kvart nije osvojen
- **WHEN** igrač pokuša da ga izabere
- **THEN** UI jasno prikazuje uslov za otključavanje umesto da započne partiju

### Requirement: Story mode SHALL pružiti narativne brifinge i debriefove
Pre pokretanja kvart misije sistem MUST prikazati kratki brifing (opis, cilj, atmosfera), a nakon završetka partije MUST prikazati debrief koji sumira ishod i posledice u gradu.

#### Scenario: Pre-mission briefing
- **WHEN** igrač započne kvart iz story mode panela
- **THEN** sistem prikazuje brifing pre nego što generiše tablu

#### Scenario: Post-mission debrief
- **GIVEN** partija je završena pobedom ili porazom
- **WHEN** igrač potvrdi rezultat
- **THEN** sistem prikazuje debrief sa ažuriranim statusom grada i predlaže sledeći kvart

### Requirement: Story mode SHALL map neighborhoods to board layouts
Svaki kvart MUST referencirati konfiguraciju table koja uključuje dimenzije, procenat neaktivnih polja i opcionalnu layout masku kojom se uklanjaju pojedine koordinate. Ova konfiguracija se koristi prilikom generisanja partije kako bi kvart vizuelno podsećao na stvarni gradski blok.

#### Scenario: Layout mask applied
- **WHEN** igrač pokrene kvart sa definisanom maskom koja isključuje određene koordinate
- **THEN** generisana tabla nema ta polja i renderer ih ne prikazuje kao aktivna ni neaktivna

#### Scenario: City-specific defaults
- **GIVEN** kvart ima specifične parametre (npr. dimenzije 12x8 i 30% blokiranih polja)
- **WHEN** se kvart pokrene preko story mode panela
- **THEN** generator table koristi te vrednosti bez potrebe da igrač ručno podešava slidere

