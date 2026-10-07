# Elden Ring Poise Wiki

Poise damage for every weapon (regular and somber), every Ash of War attack and bullet, and boss poise, extracted from `regulation.bin`.

Open `index.html` (or enable GitHub Pages on this repo) for the searchable wiki. Raw extracted data is in `data/wiki_data.json`.

## Formula

`poise damage = flat + weapon base poise × attack multiplier ÷ 100`

Fields used: `EquipParamWeapon.saWeaponDamage`, `AtkParam_Pc.atkSuperArmor` (flat) and `atkSuperArmorCorrection` (multiplier). Boss poise is `NpcParam.superArmorDurability`. This formula is derived from the field layout and has not been checked against in-game testing. Move groups are grouped by behavior ID range as a best guess.

## Rebuild from your own install

```
pip install pycryptodome zstandard
git clone https://github.com/soulsmods/Paramdex paramdex
python tools/extract_params.py "<ELDEN RING>/Game/regulation.bin" paramdex
python tools/build.py
```
Then run `python tools/make_index.py` to rebuild `index.html` from `tools/index.template.html` and `data/wiki_data.json`.

Param layouts and row names come from [Paramdex](https://github.com/soulsmods/Paramdex).

## Frame data

`data/frames.json` maps weapon motion category to attack timing: `{category: {behaviorJudgeId: [startupFrame, activeEndFrame]}}` at 30 fps. See `tools/extract_frames.py` for how it was extracted from the game archives.
