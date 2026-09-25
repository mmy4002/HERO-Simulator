# HEROES simulation: four-hour Devin build playbook

## Outcome and scope

Build a browser-based engineering demonstrator: a visible 3D head inside a transparent flexible helmet, connected to a regulated oxygen cylinder, with calculated pressure, oxygen and carbon-dioxide histories and illustrative gas-flow particles. All requested outputs stay in scope. Local flow fields, clinical predictions and structural validation do not.

Use HEROES as a provisional display name. The user supplied a reference image named figure 2A.png; its printed figure label is FIG. 1A. Treat it as geometry reference, not dimensional or material evidence. The supplied material name is “TVC”; retain “transparent flexible film, material specification unconfirmed” rather than silently changing it to PVC. Assume “wrestling adult” meant “resting adult.”

Presentation scope: this is an illustrative concept demonstration. Keep model equations and assumptions in the technical documentation. Do not add an on-screen disclaimer banner or a prescribed-breathing label. No patient trials or physical equipment operation are part of this plan.

## 0–15 minutes: get Devin working

1. Open Devin in your browser and sign in. Keep this playbook open beside it.
2. Use your existing event repository if one is provided. Otherwise, create a private GitHub repository called `heroes-simulator`, initialized with a README, through the GitHub website. Connect/select that repository in Devin. Do not spend time installing a terminal workflow.
3. If repository access blocks you for more than five minutes, ask an event mentor to connect the repository. Tell them: “I need a React static app repository available in Devin Agent mode.”
4. Start one Agent session with the default Devin agent. Upload the reference image to that session; a path on your Mac is not accessible to Devin Cloud.
5. Paste the entire master prompt below. The brief is already scoped, so a separate planning conversation is unnecessary.
6. Let Devin work. Use the same session for corrections, and ask for working-browser evidence at checkpoints.

Devin's current documentation describes selecting Agent mode and a repository for implementation. Its app deployment documentation describes hosted static frontends; availability may depend on the organization. Do not assume a deployment exists until its URL opens from your own browser.

## Master prompt — paste into Devin with the reference image

```text
Build and run a complete browser app named HEROES Engineering Simulator for a hackathon. I am working alone and am not comfortable with terminals. Aim for a working demo within 150 minutes, leaving 30 minutes for verification and pitch rehearsal. Implement now; ask only for credentials/access that actually block you. Give me short progress reports and usable preview links as milestones complete.

DELIVERABLE
A React + TypeScript + Vite static app. Use Three.js through React Three Fiber/Drei for the 3D scene, a simple chart library, and Vitest for the physics tests. No backend, database, authentication, paid API, runtime AI calls or CFD dependency. Keep the physics engine independent of React. Use a single session and incremental commits. Preserve a working version before major changes. Do not publish the uploaded reference drawing on the public site; use it only as a shape reference.

WHAT THE DEVICE LOOKS LIKE
An adult head and neck inside a transparent flexible film hood, roughly 30 cm in diameter, with a rounded dome, soft cylindrical sides, lower flexible band and silicone neck seal, matching the uploaded reference. No rigid shell, hard collar or glass fishbowl appearance. Show an oxygen cylinder outside the hood, regulator, hose and one inlet at the lower side. Show two distinct outlets on the opposite lower side: maintenance outlet and pressure-triggered overflow outlet. Label these clearly. The rigid-looking cylinder/regulator are separate from the flexible helmet.

Make the face clearly recognizable from the default three-quarter camera view. A clean procedural stylized head with nose, ears, eyes and chin is acceptable and mandatory as a fallback. Do not waste time sourcing photorealistic assets. Use orbit/zoom/reset-camera controls. Render the hood transparently without obscuring the face. Avoid transparency sorting bugs. Subtle surface seams/folds may suggest film. Any exaggerated deformation must be labeled illustrative.

MODEL BOUNDARIES
This is a well-mixed, lumped gas model with illustrative particles. It is not CFD, structural analysis, a medical device controller or a validated physiological model. No local CO2 pockets, tissue oxygen predictions, SpO2, clinical safety scores or claims of hyperbaric equivalence.
Do not add an on-screen disclaimer banner or a prescribed-breathing label. Keep the interface focused on the illustrative concept and calculated outputs. Document model assumptions in the technical model note. Display helmet absolute pressure and helmet minus ambient pressure.

UNITS AND INITIAL CONDITIONS
Use SI internally: Pa, m3, seconds, kelvin, moles. Display pressure in bar absolute and gauge; display the airway-to-ambient differential in cmH2O in model details. 1 bar = 100000 Pa. All species fractions are dry mole fractions.
All external flow controls use reference L/min defined explicitly at 1.0 bar absolute and 293.15 K. Do not call these “standard” without specifying that convention. Convert flow to mol/s using the ideal gas law. Optionally show actual L/min at helmet conditions as a secondary readout.
Start at ambient 1.0 bar absolute, 293.15 K, dry air: O2 0.2095, CO2 0.0004, balance inert gas. Oxygen source is 100% O2, assumed.
User-confirmed values: nominal diameter 30 cm, source pressure nominally 200 bar, default relief threshold 1.5 bar absolute. Source pressure convention is not confirmed: use 200 bar absolute as a prominently documented demo assumption.
Do not derive helmet volume from diameter alone. Use independently editable free gas volume excluding the head, initially 12 L, labeled unmeasured. Do not claim the head model measures displacement.

FLEXIBLE VOLUME
Use an explicit phenomenological inflated-hood compliance model, not an unstated rigid tank:
V(P) = V0 + C*(P-Pambient), with V0=12 L and C=0.02 L/kPa as UNCALIBRATED demo assumptions, editable; C=0 is the fixed-volume sensitivity case.
Solve P*V(P)=nRT robustly for the positive physical root. Restrict this simple inflated-hood model to P >= Pambient and an explicitly documented maximum pressure/volume domain. Stop the run with “outside model domain” if it would enter collapse or exceed the domain. Do not clamp pressure to ambient or the relief threshold and silently discard gas. No structural adequacy or actual film expansion claim. The 3D mesh need not reproduce physical deformation.

SUPPLY AND VALVES
Represent: fixed 200-bar source -> adjustable ideal pressure regulator -> inlet flow controller -> helmet.
Demo assumption: source is constant pressure, with cumulative oxygen consumption tracked; cylinder depletion/time remaining is not calculated because cylinder water volume is unknown.
Controls: regulator outlet pressure (bar absolute), requested inlet flow (reference L/min), maintenance outflow (reference L/min), overflow opening threshold (bar absolute), overflow open capacity (reference L/min, advanced).
Use a documented idealized inlet law: qin = qset*clamp((Preg-Phelmet)/Deltap,0,1), with Deltap=0.1 bar as an assumed controller headroom. Require Preg below source pressure. Prevent reverse supply flow. Explain that this is a flow-controller approximation, not a measured regulator curve. Changing regulator pressure does not directly set helmet pressure.
Maintenance outlet is an ideal constant-flow exhaust while pressure is above ambient, per the requested simplification. At/below ambient it cannot actively suck gas out. Display requested and delivered flows separately. This is not a passive needle-valve law; say so in assumptions.
Overflow opens immediately when P reaches the adjustable threshold and closes below it, with finite adjustable open capacity. Require threshold > ambient. Treat its finite capacity as an idealized valve behavior. Opening must not magically clamp pressure or create unlimited venting. Use threshold-aware substepping to handle switching. Start with zero hysteresis; do not hide numerical chatter by silently changing the threshold. If optional hysteresis is added, default it off, document it and show its units.
Both exhausts vent the current well-mixed helmet gas to ambient. Leak flow defaults to zero; do not add an unrequested leak model before the core works.
Suggested demonstration values only: Preg=1.7 bar absolute, inlet=30 reference L/min, maintenance=20 reference L/min, relief threshold=1.5 bar absolute, open relief capacity=100 reference L/min. These are arbitrary numerical examples, not operating recommendations. Keep all controls editable within documented model bounds.

GAS CONSERVATION AND BREATHING
Track helmet moles of O2, CO2 and inert gas. Fractions come from inventories; pressure comes from total moles, temperature and the volume law. Update flows conservatively. Track cumulative species crossing external boundaries and metabolic exchange for audit/tests.
Build a replaceable PatientModel interface. First patient is a resting-adult breathing animation and gas-exchange model: 12 breaths/min, inhaled tidal volume 0.5 actual L at helmet conditions, I:E=1:2, oxygen consumption 0.25 reference L/min and CO2 production 0.20 reference L/min. All are demo assumptions documented in the model note and adjustable in an advanced panel. No autonomous physiological response to pressure or CO2.
Implement a simple breath reservoir to conserve species: during inspiration, remove helmet mixture using a smooth waveform integrating to the configured inhaled tidal volume; accumulate removed species in a separate reservoir. During expiration, return that captured gas after subtracting the configured per-breath O2 uptake and adding configured per-breath CO2 production. Spread return smoothly over expiration. Track exchanged moles explicitly; returned actual volume can differ from inhaled volume. This is a transport bookkeeping proxy, not an anatomical lung model.
Begin each run at the start of inspiration with an empty breath reservoir. If the captured O2 inventory cannot support the configured uptake, flag the model as invalid; never allow negative species or silently create O2. Likewise, never force arbitrary exhaled fractions such as 16% O2 when inhaling oxygen-rich gas. Do not add CO2 twice via both fixed exhaled fractions and a metabolic source.
Calculate inhaled CO2 per completed inspiration as sum(xCO2*dn_inhaled)/sum(dn_inhaled); calculate inspired oxygen the same way. Label these “well-mixed model.” Before the first inspiration completes, show “awaiting first breath.” Bulk and inhaled values may differ because the latter is a breath-weighted average, not because local spatial concentrations were resolved.
Also show dry-gas pCO2=xCO2*P and pO2=xO2*P, distinguished from alveolar/arterial measurements. Pressure changes can affect partial pressure without the same change in percentage.

NUMERICS
Use a deterministic simulation clock independent of animation frame rate. Start with 0.01-second steps, refine for valve events/rapid transfers, and test convergence. Support pause, resume, reset, 1x/5x/10x speed and a 5-minute simulated run. Keep chart updates slower than render frames. Pause or handle hidden browser tabs without a giant unstable time step.
No negative moles, unexplained pressure clipping or fabricated curves. If a step would remove more gas than available, refine it or surface a model-domain error. Parameter changes during a run get timestamped event markers; geometry/compliance/patient changes can require reset with a clear UI explanation.

SCREEN
Desktop layout: controls left, large 3D helmet/head center, live readings right, synchronized time charts below. Clean presentation readable on a projector. Label every slider with units and a numeric input.
Live results: bulk CO2 % and ppm; breath-weighted inhaled CO2; bulk O2 %; absolute and gauge helmet pressure; inlet, maintenance, overflow and total outlet flows; overflow open/closed and recent duty cycle; cumulative source oxygen consumed in reference liters; simulated time and breath phase. Show partial pressures in details/tooltips.
Charts: CO2 over time with inhaled breath markers; helmet pressure with relief threshold; oxygen fraction; three external flow traces. Avoid mixing incompatible units on an unlabeled axis.
Animate blue inflow particles, exhalation pulses at mouth/nose and outflow particles whose rates respond to computed flows. Show oxygen/CO2 colors with a legend, but particle counts/trajectories are illustrative, not molecular concentrations or CFD. Airway animation follows the actual simulated breath phase. Valve activity follows computed valve state.

COMPARISON AND EXPORT
Provide Run A / Run B comparison from the same initial state, patient and simulation duration, with separate saved parameter sets and chart overlays. Run them through the same engine. Changing settings must not mutate saved runs. Show summary mean/peak CO2, final/peak pressure, mean inspired CO2 over completed breaths, oxygen used and overflow duty cycle. State the averaging time window.
Allow CSV export of time series with units and JSON export/import of parameters, assumptions and model version. Store saved runs locally. Provide a brief model assumptions drawer and a one-click demo reset.

VERIFICATION
Test: sealed/no-breath/no-flow inventories and pressure remain constant; fixed-volume closed inflow follows nRT/V; compliant volume satisfies P*V=nRT; unit conversion preserves molar flow; pure O2 flushing with no patient follows the analytical well-mixed washout solution under fixed-volume/constant-pressure balanced molar flows; breath reservoir plus helmet obey species balance with metabolism; no overflow below threshold and finite discharge above it; insufficient relief capacity allows pressure to rise; blocked supply cannot backflow; reset is deterministic; timestep halving produces close results across threshold crossings (compare pressure, gas fractions, cumulative discharge and duty cycle rather than exact switching instants).
For the analytical flush fixture use x(t)=xin+(x0-xin)*exp(-ndot*t/n), with constant n and equal molar inflow/outflow. Keep this fixture separate from the full clinical-looking demo.
Add browser checks for play/pause/reset, editable controls, 3D visibility, completed A/B comparison and CSV export. Run production build and tests. Use numerical evidence, not screenshots alone, to validate the engine.

DELIVERY ORDER
1. Working basic 3D head/hood and tested engine with live metrics.
2. All controls, all charts, breathing/flow animation.
3. A/B comparison, exports, assumption labels and visual polish.
4. Production build, browser verification and deployment.
At each checkpoint report the working preview, completed features, failed checks and remaining gaps. Do not stop after scaffolding or presenting a plan.
Prepare a README with exact install/build/start commands and a model note with equations, units, assumptions and test results. Keep all assets local for reliable presentation.
Prepare the production build and, once I request deployment, use Devin-hosted static deployment if available. If unavailable, tell me the simplest exact browser-based fallback and which login action is required. Do not assume a preview URL is permanent. Keep a local-run fallback and provide a short screen recording of the working demo if supported.
```

## Your checkpoints and follow-up prompts

### Minute 35: require a running skeleton

Open Devin's preview on your own laptop. The head must be recognizable through the hood. You should be able to press Play and see time, pressure and CO2 change.

If it is still planning or selecting packages, send:

> Prioritize a running end-to-end slice now: procedural 3D head and transparent hood, Play/Pause/Reset, the conservative gas engine, pressure and CO2 readings. Keep the accepted requirements, defer cosmetic polish, and give me a preview I can open. List actual blockers.

### Minute 60: inspect the model, not just the picture

Ask:

> Show the unit conventions, implemented species-balance equation, breathing bookkeeping and flexible-volume equation. Confirm that all displayed numbers come from this engine, particles are illustrative, maintenance flow is an ideal controller assumption, and relief opening does not clamp pressure. Run the closed-system, gas-law and breathing conservation tests and report results.

You do not need to audit the code line by line. Bring Devin's response back to this conversation if any claim is unclear. Do not accept “physics looks realistic” as numerical verification.

### Minute 90: exercise every control

1. Run the baseline and confirm the pressure threshold line is visible.
2. Change maintenance flow and observe both total exhaust and pressure. A CO2 improvement is not guaranteed if relief flow compensates for the change.
3. Change inlet flow and inspect CO2, pressure, oxygen use and relief activity together.
4. Change relief threshold; confirm the opening event follows it.
5. Reduce regulator pressure below the helmet pressure; inflow should stop, not reverse.
6. Pause: time and data must stop. Resume: they must continue without a discontinuous jump.
7. Reset: the initial values and charts must reset reproducibly.

For a defect, send a reproducible report:

> I started from [preset], changed [control] from [value + unit] to [value + unit], and observed [actual]. Expected [specific behavior]. Fix this, run the relevant test and confirm it in the browser. Preserve the other working features.

### Minute 120: compare runs and request deployment

Use identical initial conditions and duration for A and B. Suggested demo comparisons: baseline vs altered maintenance flow, then baseline vs increased supply flow. Describe the actual results, even if your initial intuition was wrong.

Send:

> Complete A/B comparison, CSV/JSON exports and the assumptions drawer. Run tests and production build. Deploy the verified static app using the hosting available in this Devin organization and give me the URL. Tell me if it expires or requires login. If built-in deployment is unavailable, prepare the static build and give me the shortest supported deployment path, with only the necessary browser login steps for me.

The app and model notes may be public; the uploaded reference drawing should stay out of the published files. Do not authorize extra paid services merely to get a link.

### Minute 150: freeze features and verify delivery

Send:

> Freeze new features. Fix only demo blockers. Verify the deployed version, not just the dev server: 3D scene, all controls, charts, threshold behavior, A/B runs, downloads, reset and absence of console errors. Report the deployed commit and unresolved limitations. Preserve a known working commit, provide the source repository link, exact local startup instructions and a demo recording if available.

Open the deployed URL in a private browser window. Confirm it loads without your Devin login. Download one CSV and check that it contains numbers, headers and units. Save the repo URL, deployment URL and recording together. If you have a local fallback running, load it once and keep that tab open.

### Minutes 150–180: rehearse the pitch

Use this 90-second sequence:

1. “We built an interactive engineering model of a flexible oxygen helmet to investigate how gas delivery and exhaust settings interact.”
2. Rotate the helmet to show head, neck seal, cylinder and three ports.
3. Start the baseline; point to exhalation pulses, CO2 and pressure.
4. Show one saved comparison and explain the actual measured model differences.
5. Point to the overflow response and oxygen consumption.
6. “The gas balance drives the charts, while the animation illustrates the concept. We can compare how delivery and exhaust settings affect pressure, gas concentrations and oxygen consumption.”

Do not spend the pitch adjusting many sliders or waiting five real minutes. Save completed comparisons and use simulation speed controls.

### Minutes 180–240, if available

Improve labels, camera framing and presentation; fix identified defects. Add a second patient preset only if the existing engine and demo are stable. Do not start CFD, material stress analysis, a new framework or a new hosting migration.

## Time-saving decisions

- Keep one Devin session for implementation. Do not create competing versions.
- Ask for a working preview and evidence at milestones, not continuous narration.
- If model downloads fail, use the procedural head immediately. The 3D head remains essential.
- If fancy particle effects are slow, reduce particle count. Preserve correct calculated outputs.
- If deformation is unstable, use the soft-looking static hood with the documented compliance calculation. Do not pretend visual motion is a structural solution.
- If hosting is blocked, preserve the working preview and recording while resolving access; do not call it a completed public deployment.
- Preserve conservation, units and pressure conventions, and keep model assumptions documented when polishing the visuals.

## Sources and interpretation

- [Event agenda](https://luma.com/drjvjdpz): build starts at 2 PM and pitches at 5 PM; plan for three hours before pitching.
- [Devin first session](https://docs.devin.ai/get-started/first-run): Agent mode and repository selection.
- [Devin deployments](https://docs.devin.ai/product-guides/deployment-capabilities): hosted application deployment capabilities; verify organization availability.
- [Physiological study of helmet CPAP](https://pubmed.ncbi.nlm.nih.gov/14564379/): evidence that a head helmet can transmit positive airway pressure. Pressure differences in the model are calculated from helmet and ambient pressures.
- [FDA description of HBOT devices](https://www.fda.gov/medical-devices/letters-health-care-providers/follow-instructions-safe-use-hyperbaric-oxygen-therapy-devices-letter-health-care-providers): HBOT uses a pressurized chamber; this simulation does not establish device safety or therapeutic equivalence.

All numerical demo settings beyond the user-confirmed inputs are explicit illustrative assumptions. They are neither measured HEROES specifications nor patient operating instructions.
