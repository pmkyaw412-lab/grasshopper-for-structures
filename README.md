# Grasshopper for Structures

A self-paced Grasshopper course for structural engineers: parametric modelling in Rhino, Karamba analysis, Japanese allowable stress member checks, Galapagos optimisation and Kangaroo form-finding. Each session has a live example in the browser, practice drills, fix-the-bug exercises, build challenges and a checklist.

**Open the course:** https://pmkyaw412-lab.github.io/grasshopper-for-structures/

## Saving progress

Press **Sign in** in the top bar and choose your Google account. Ticks, drill answers and matrix scores then save to that account (Firebase Authentication + Cloud Firestore) and follow you to any device. Signed out, progress is kept in the current browser only, and is merged into your account the first time you sign in.

The Firestore rules let each signed-in account read and write only its own document at `users/{uid}`. The Firebase web config in `index.html` is a public identifier, not a secret.

## Editing the course

The page is built from the files in `source/`:

```
cd source
python3 build.py          # writes site/index.html (and the single-file version)
cp site/index.html ../index.html
```

`source/parts/` holds the HTML for each stage, the styles (`head.html`) and the scripts (solver, simulators, practice, progress). `source/test/` has solver tests (`node test/solver.test.js`) and the sign-in flow test.
