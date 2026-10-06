"""Decrypt regulation.bin and dump the param tables the wiki uses to params.pkl.
Usage: python tools/extract_params.py "<ELDEN RING>/Game/regulation.bin" paramdex
Needs: pip install pycryptodome zstandard ; git clone https://github.com/soulsmods/Paramdex paramdex"""
import sys,pickle,os
sys.path.insert(0,os.path.dirname(__file__))
import er
reg,pdx=sys.argv[1],sys.argv[2]
files=er.parse_bnd4(er.load_regulation(reg))
T=[('EquipParamWeapon','EquipParamWeapon'),('SwordArtsParam','SwordArtsParam'),('EquipParamGem','EquipParamGem'),('Bullet','BulletParam'),('AtkParam_Pc','AtkParam'),('BehaviorParam_PC','BehaviorParam'),('NpcParam','NpcParam'),('ReinforceParamWeapon','ReinforceParamWeapon')]
out={}
for pn,df in T:
    out[pn]=er.parse_param(files[pn+'.param'],os.path.join(pdx,'ER','Defs',df+'.xml'))[2]
pickle.dump(out,open('params.pkl','wb'))
print('wrote params.pkl')
