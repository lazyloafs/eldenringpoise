"""Pull attack timing (startup/active frames) for every weapon class out of the game archives.
This is the pipeline used for data/frames.json. Steps, all tested against the 2026 game files:

1. Data3.bhd is RSA-encrypted. The public keys are plain PEM strings inside eldenring.exe
   (five of them; try each). Decrypt 256-byte blocks with pow(c, e, n), keep the last 255 bytes of each.
2. Parse the BHD5 header: bucketCount/bucketsOffset at 0x10/0x14, file headers are 0x28 bytes:
   u64 name hash, i32 paddedSize, i32 unpaddedSize, i64 offset, i64 shaOffset, i64 aesOffset.
   Name hash = fold over the lowercase path, h = h*0x85 + ord(c) (u64). Path: /chr/c0000.anibnd.dcx
3. Read paddedSize bytes at `offset` from Data3.bdt and AES-ECB-decrypt the ranges listed at aesOffset
   (key 16 bytes, i32 rangeCount, then i64 start/end pairs).
4. DCX KRAK: header sizes are big-endian at 0x1C (uncompressed) and 0x20 (compressed); the Oodle stream starts at 0x4C.
   The ooz decoder (github.com/zao/ooz, also bundled in pip pyooz) needs ONE change for these files:
   in Kraken_ReadLzTable and Kraken_ProcessLzRuns, treat `offset == 0` as `(offset & 0x3FFFF) == 0`.
   Each 256 KB quantum in this data starts with 8 raw bytes.
5. BND4 entries are 36 bytes: csize at +8, data offset at +24, name offset at +32 (UTF-16).
   Weapon timing lives in tae/aNN.tae where NN = EquipParamWeapon.wepmotionCategory.
6. TAE3: animation table pointer at 0x58 (count at 0x54), 16-byte entries (id, offset). Each animation header is
   <qqqqiiii> (eventHeaders, eventGroups, times, animFile, eventCount, groupCount, timeCount, pad).
   Event headers are 24 bytes (startTimeOffset, endTimeOffset, dataOffset); times are float seconds, x30 = frames.
   Event data: i32 type, then i64 params offset at +8. Type 1 = attack behavior; its params are
   (0, hitIndex, BehaviorJudgeID, flags). Join to BehaviorParam_PC on behaviorJudgeId.
"""
