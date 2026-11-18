import json,sys,glob,statistics as st
L=[json.loads(l) for f in sys.argv[1:] for l in open(f) if l.startswith('{')]
bad=[x for x in L if 'bloque' in x or x.get('viol') or x.get('errs')]
print('anomalies',bad[:5])
L=[x for x in L if 'score' in x]
strats=list(dict.fromkeys(x['s'] for x in L)); heroes=list(dict.fromkeys(x['hero'] for x in L))
print('%-10s'%'strat', ' '.join('%9s'%h[:9] for h in heroes), '|  moy  délai  qual   coût  burn gaps')
for s in strats:
  r=[x for x in L if x['s']==s]
  cells=[]
  for h in heroes:
    v=[x['score'] for x in r if x['hero']==h]; cells.append('%9.0f'%st.mean(v) if v else '        -')
  m=lambda k: st.mean(x[k] for x in r)
  print('%-10s'%s,' '.join(cells),'| %5.0f %5.0f %5.1f %6.0f %4.1f %4.1f'%(m('score'),m('total'),m('q'),m('cout'),m('burn'),m('gaps')))
