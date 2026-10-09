import json,re,sys
t=open(sys.argv[1]).read(); nombre=sys.argv[2]
dec=json.JSONDecoder(); objs=[]; i=0
while True:
    j=t.find('{',i)
    if j<0: break
    try: o,k=dec.raw_decode(t,j); objs.append(o); i=k
    except Exception: i=j+1
err=[];con=[];fin=''
for o in objs:
    if isinstance(o,dict):
        err+=o.get('errores',[]) or o.get('e',[]) or []
        con+=[x for x in (o.get('consola',[]) or o.get('k',[]) or []) if 'no-existe' not in x]
        fin=o.get('final',fin) or fin
if not objs: print(nombre,'SIN SALIDA', t[-300:])
else: print(nombre,'OK' if not err and not con else 'FALLA', err[:3], con[:3], str(fin)[:30])
