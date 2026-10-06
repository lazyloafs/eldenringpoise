import struct, re
import xml.etree.ElementTree as ET
from Crypto.Cipher import AES
import zstandard
KEY=bytes.fromhex("99BFFC366A6BC8C6F5827D093602D676C42892A01C207FB024D3AF4E493FEF99")
def load_regulation(path):
    d=open(path,'rb').read()
    pt=AES.new(KEY,AES.MODE_CBC,d[:16]).decrypt(d[16:][:len(d[16:])//16*16])
    unc,comp=struct.unpack('>II',pt[0x1C:0x24])
    return zstandard.ZstdDecompressor().decompress(pt[0x4C:0x4C+comp],max_output_size=unc)
def parse_bnd4(b):
    cnt=struct.unpack('<i',b[0xC:0x10])[0]
    pos=0x40; out={}
    for i in range(cnt):
        csize,usize=struct.unpack('<qq',b[pos+8:pos+24]); doff,_id,noff=struct.unpack('<III',b[pos+24:pos+36])
        e=noff
        while b[e:e+2]!=b'\0\0': e+=2
        out[b[noff:e].decode('utf-16le').split('\\')[-1]]=b[doff:doff+csize]
        pos+=36
    return out
TYPES={'s8':('b',1),'u8':('B',1),'s16':('h',2),'u16':('H',2),'s32':('i',4),'u32':('I',4),'f32':('f',4),'dummy8':('B',1),'fixstr':('s',1),'fixstrW':('s',2),'b32':('i',4)}
def load_def(path):
    r=ET.parse(path).getroot()
    fields=[]
    for f in r.find('Fields'):
        d=f.get('Def')
        m=re.match(r'(\w+)\s+(\w+)(?:\[(\d+)\])?(?::(\d+))?(?:\s*=\s*(.+))?$',d)
        t,n,arr,bits,_=m.groups()
        fields.append((t,n,int(arr) if arr else None,int(bits) if bits else None))
    return r.findtext('ParamType'),fields
def layout(fields):
    off=0;out=[];bitpos=None;bittype=None
    for t,n,arr,bits in fields:
        fmt,sz=TYPES[t]
        if bits is not None:
            if bittype is None or TYPES[bittype][1]!=sz or bitpos is None or bitpos+bits>sz*8:
                if bittype is not None and bitpos is not None and bitpos>0: off+=TYPES[bittype][1]
                bitpos=0;bittype=t
            out.append((n,t,off,bitpos,bits)); bitpos+=bits
            continue
        if bitpos is not None and bitpos>0: off+=TYPES[bittype][1]
        bitpos=None;bittype=None
        total=sz*(arr or 1)
        if arr and t not in('fixstr','fixstrW','dummy8') : pass
        if t!='dummy8': out.append((n,t,off,None,arr))
        off+=total
    if bitpos is not None and bitpos>0: off+=TYPES[bittype][1]
    return out,off
def parse_param(raw,defpath):
    ptype,fields=load_def(defpath); lay,size=layout(fields)
    cnt=struct.unpack('<H',raw[0x0A:0x0C])[0]
    rows={}
    for i in range(cnt):
        p=0x40+i*24
        rid,doff,noff=struct.unpack('<i4xqq',raw[p:p+24])
        rec={}
        for n,t,off,bp,x in lay:
            if bp is not None:
                fmt,sz=TYPES[t]; v=struct.unpack_from('<'+fmt,raw,doff+off)[0]; rec[n]=(v>>bp)&((1<<x)-1)
            elif t in('fixstr',): rec[n]=raw[doff+off:doff+off+x].split(b'\0')[0].decode('ascii','ignore')
            elif t=='fixstrW': rec[n]=raw[doff+off:doff+off+2*x].decode('utf-16le').split('\0')[0]
            elif x: rec[n]=list(struct.unpack_from('<%d%s'%(x,TYPES[t][0]),raw,doff+off))
            else: rec[n]=struct.unpack_from('<'+TYPES[t][0],raw,doff+off)[0]
        rows[rid]=rec
    return ptype,size,rows
