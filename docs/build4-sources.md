# Build 4 source provenance

The active daily board on 2026-09-26 identified itself through `https://bearproof.app/b/4/build-info.json` as:

- Build: `4`
- Ref: `build-4`
- Commit: `1f68eabbc04bcf838277bc7a9122ac2a4e1274c9`
- Activation: `2026-09-26T00:00:00Z`
- Title: `Airdrop crates`

The local simulator's core gameplay modules were fetched from the live Build 4 game at `/b/4/src/sim/` and compared with the repository. These upstream modules are copied directly:

- `src/sim/content.js`
- `src/sim/entities.js`
- `src/sim/weapons.js`
- `src/sim/runlog.js`

`src/sim/sim.js` is merged with the official Build 4 opening-wave, closer-spawn, crate-drop, crate-loot, and boss-spawn rules. The repository retains its extra non-gameplay diagnostics (score breakdowns, combat telemetry, and clone/lookahead support). It does not alter enemy, weapon, player, score, or tick-cap physics. The replay header records simulation version `4`; `SIM.MAX_TICKS` remains the official 72,000 ticks.

The client metadata can be checked at:

- Build info: <https://bearproof.app/b/4/build-info.json>
- Live challenge: <https://bearproof.app/api/daily>
- Build 4 game: <https://bearproof.app/b/4/>

Build 3 sources and results remain historical in [build3-sources.md](build3-sources.md); they are not interchangeable with Build 4.
