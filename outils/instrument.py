# Copie instrumentée du jeu pour les tests : expose l'état et les actions au robot (window.__api, __start, __end, __piege)
# Usage : python3 instrument.py [sortie]   (par défaut travail/game.html)
import sys, os
ici=os.path.dirname(os.path.abspath(__file__))
sys.argv.append(os.path.join(ici,'travail','game.html')) if len(sys.argv)<2 else None
os.makedirs(os.path.join(ici,'travail'),exist_ok=True)
s=open(os.path.join(ici,'..','index.html'),encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(a,s.count(a)); s=s.replace(a,b)
rep("let Gt = (0, a.useRef)(null);","let Gt = (0, a.useRef)(null); window.__piege = (g) => g.dilemma && g.dilemma.kind === 'gap' && di(g.dilemma.idx); window.__api = { He, hn, ln, an, imp, bnv, dn, Sa, Xt, qe, n, la, ze, De, Ue, Oe, Xe, Ge, un, Pe, msg: () => rr.current, file: () => wr.current.length, reunion: () => v, sick: () => yt, we: () => dt };")
rep('t === "select" &&\n','(window.__start = (id, res) => { (Le(), res || Tr(fr, null), o(id), d(res || null), s((D) => D + 1), r("game")); }),\n        t === "select" &&\n')
rep("onEnd: (f) => {","onEnd: (f) => { window.__end && window.__end(f);")
open(sys.argv[1],'w',encoding='utf-8').write(s)
s=open(sys.argv[1],encoding='utf-8').read()
a="let ca = r.cafeAnim ? cafePos(r.cafeAnim.e) : null;"
assert s.count(a)==1
s=s.replace(a,a+" if (window.__noDraw) return;")
open(sys.argv[1],'w',encoding='utf-8').write(s)
