import pickle,json,re,collections
P=pickle.load(open('/home/claude/params.pkl','rb'))
W=P['EquipParamWeapon'];A=P['AtkParam_Pc'];B=P['BehaviorParam_PC'];U=P['Bullet'];N=P['NpcParam'];R=P['ReinforceParamWeapon'];G=P['EquipParamGem'];S=P['SwordArtsParam']
def names(f):
    d={}
    for l in open('/home/claude/paramdex/ER/Names/%s.txt'%f,encoding='utf8'):
        i,_,n=l.rstrip('\n').partition(' ')
        try:d[int(i)]=n
        except:pass
    return d
wn,an,bn,nn,gn,sn=[names(x) for x in('EquipParamWeapon','AtkParam_Pc','Bullet','NpcParam','EquipParamGem','SwordArtsParam')]
GN={int(k):v for k,v in json.load(open('data/game_names.json')).items()}
DL=json.load(open('data/dlc_ids.json'));DW=set(DL['weapon']);DN=set(DL['npc'])-{0}
NG={int(k):v for k,v in json.load(open('data/npc_names.json')).items()}
TYPES={1:'Dagger',3:'Straight Sword',5:'Greatsword',7:'Colossal Sword',9:'Curved Sword',11:'Curved Greatsword',13:'Katana',14:'Twinblade',15:'Thrusting Sword',16:'Heavy Thrusting Sword',17:'Axe',19:'Greataxe',21:'Hammer',23:'Great Hammer',24:'Flail',25:'Spear',28:'Great Spear',29:'Halberd',31:'Reaper',33:'Fist',35:'Fist',37:'Claw',39:'Whip',41:'Colossal Weapon',50:'Light Bow',51:'Bow',53:'Greatbow',55:'Crossbow',56:'Ballista',57:'Glintstone Staff',61:'Sacred Seal',65:'Small Shield',67:'Medium Shield',69:'Greatshield',87:'Torch',88:'Hand-to-Hand',89:'Perfume Bottle',90:'Thrusting Shield',91:'Throwing Blade',92:'Backhand Blade',93:'Light Greatsword',94:'Great Katana',95:'Beast Claw'}
def levels(t):
    n=0
    while t+n+1 in R: n+=1
    return n if t in R else 0
beh=collections.defaultdict(list)
for k,b in B.items():
    beh[b['variationId']].append((k,b))
def atk_of(b):
    if b['refType']==0: return b['refId'],'melee'
    if b['refType']==1:
        u=U.get(b['refId'])
        if u: return u['atkId_Bullet'],'bullet'
    return None,None
movesets={}
def moveset(v):
    if v in movesets: return
    rows=[]
    for k,b in sorted(beh.get(v,[])):
        aid,kind=atk_of(b)
        if aid is None or aid not in A: continue
        nm=an.get(aid,'')
        if '[AOW]' in nm: continue
        a=A[aid]
        rows.append([b['behaviorJudgeId'],nm,round(a['atkSuperArmor'],2),round(a['atkSuperArmorCorrection'],1),1 if kind=='bullet' else 0,1 if k//100000000==3 else 0])
    movesets[v]=rows
weapons=[]
for wid,w in sorted(W.items()):
    n=GN.get(wid) or wn.get(wid,'')
    n=n.replace('[ERROR]','').strip()
    if n in('[ERROR]','DLC dummy'): continue
    if wid%1000 or not n or n.startswith('[NPC]') or w['wepType'] not in TYPES or w['wepType'] in (81,83,85,86): continue
    t=w['reinforceTypeId']; lv=levels(t)
    up='Somber' if 0<lv<=10 else ('Regular' if lv>10 else 'Other')
    v=w['behaviorVariationId']; vs=[v]
    if v%100 and (v//100*100) in beh: vs.append(v//100*100)
    for x in vs: moveset(x)
    weapons.append(dict(dlc=1 if wid in DW else 0,unl=0,id=wid,cat=w['wepmotionCategory'],name=n,type=TYPES[w['wepType']],up=up,maxLv=lv,sa=round(w['saWeaponDamage']*R.get(t,{}).get('saWeaponAtkRate',1.0),2),vs=vs))
# ashes
ash=collections.defaultdict(lambda:collections.defaultdict(lambda:collections.defaultdict(int)))
def add(nm,aid,kind):
    m=re.match(r'^(?:(.*?) )?\[AOW\] (.*)$',nm)
    if not m or aid not in A: return
    cat=m.group(1) or 'All'; sk=m.group(2).strip()
    a=A[aid]
    ash[sk][cat][(round(a['atkSuperArmor'],2),round(a['atkSuperArmorCorrection'],1),kind)]+=1
for aid,a in A.items():
    nm=an.get(aid,'')
    if '[AOW]' in nm: add(nm,aid,'melee')
for bid,u in U.items():
    nm=bn.get(bid,'')
    if '[AOW]' in nm: add(nm,u['atkId_Bullet'],'bullet')
gemset={}
for gid,g in G.items():
    n=gn.get(gid,'')
    if n.startswith('Ash of War: '): gemset[n[12:]]=gemset.get(n[12:],0)+1
ashes=[]
for sk,cats in sorted(ash.items()):
    rows=[]
    for cat,d in sorted(cats.items()):
        for (f,c,kind),cnt in sorted(d.items(),key=lambda x:(x[0][1],x[0][0])):
            rows.append([cat,f,c,kind,cnt])
    ashes.append(dict(name=sk,isAsh=sk in gemset,rows=rows))
# bosses
bos={}
for nid,v in N.items():
    if not v['isSoulGetByBoss']: continue
    n=NG.get(v.get('nameId',-1)) or nn.get(nid,'')
    if not n or n=='?' or n=='[ERROR]': continue
    key=(n,v['superArmorDurability'],round(v['superArmorRecoverCorrection'],3),v['hp'])
    if key not in bos: bos[key]=dict(name=n,poise=round(v['superArmorDurability'],1),rec=round(v['superArmorRecoverCorrection'],3),saRate=round(v['saRecoveryRate'],3),hp=v['hp'],ids=[nid],dlc=1 if (nid>=50000000 or v.get('nameId') in DN) else 0)
    else: bos[key]['ids'].append(nid)
bosses=sorted(bos.values(),key=lambda b:b['ids'][0])
FR=json.load(open('/home/claude/frames.json'))
json.dump(dict(frames=FR,movesets={str(k):v for k,v in movesets.items()},weapons=weapons,ashes=ashes,bosses=bosses),open('/home/claude/wiki_data.json','w'),separators=(',',':'))
print(len(weapons),sum(len(v) for v in movesets.values()),len(ashes),sum(a['isAsh'] for a in ashes),len(bosses))
print(collections.Counter(w['up'] for w in weapons))
