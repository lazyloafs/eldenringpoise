"""Estimate hits per Ash of War use from animation data.
Input aow_anims.json: {cat: {anim: [[frame, judgeId], ...]}} (type-1 attack events whose judge id is an Ash of War
judge id and is not a regular move of that weapon class), produced on the device from c0000.anibnd (see extract_frames.py).
Events within 2 frames of each other are one hit (a swing can have several hitboxes). Output is merged into wiki_data.json."""
import json,collections,re,sys
def run(A,beh,atk_of,an,cats):
    anims=json.load(open('/home/claude/aow_anims.json'))
    # judge -> {skill: [(flat,corr)]} from variation 0
    jm=collections.defaultdict(dict)
    for k,b in beh.get(0,[]):
        aid,kind=atk_of(b)
        if aid is None or aid not in A: continue
        m=re.match(r'^(?:(.*?) )?\[AOW\] (.*)$',an.get(aid,''))
        if m: jm[b['behaviorJudgeId']][m.group(2).strip()]=(round(A[aid]['atkSuperArmor'],2),round(A[aid]['atkSuperArmorCorrection'],1))
    best={}
    for cat,d in anims.items():
        if int(cat) not in cats: continue
        for aid,ev in d.items():
            per=collections.defaultdict(list)
            for f,j in ev:
                for sk,v in jm.get(j,{}).items(): per[sk].append((f,v))
            for sk,l in per.items():
                l.sort(key=lambda x:x[0]);hits=[]
                for f,v in l:
                    if hits and f-hits[-1][0]<=2: hits[-1][1].append(v)
                    else: hits.append([f,[v]])
                key=(len(hits),sum(max(P*5.5/100+F for F,P in h[1]) for h in hits))
                if sk not in best or key>best[sk][0]: best[sk]=(key,[sorted(set(h[1])) for h in hits],cat)
    return {sk:dict(hits=v[0][0],seq=v[1],cat=v[2]) for sk,v in best.items()}
