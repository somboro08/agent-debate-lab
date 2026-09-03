import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { ArrowUpRight, Check, ChevronRight, CircleDashed, Lightbulb, MessageSquare, PanelLeft, Play, Plus, Scale, Sparkles, Target, Users } from "lucide-react";

const seedContext = "Nous voulons créer une plateforme qui aide les équipes non techniques à transformer une idée en projet testable, en quelques jours, sans perdre la nuance du problème initial.";
const seedObjective = "Établir un problème clair que le projet va résoudre";
type TranscriptItem = { speaker: string; role: string; tone: string; text: string };

export default function Home() {
  const [context, setContext] = useState(seedContext);
  const [objective, setObjective] = useState(seedObjective);
  const [projectName, setProjectName] = useState("Atelier Produit");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const debate = trpc.debate.run.useMutation();

  const runDebate = async () => {
    if (!context.trim() || !objective.trim()) return;
    setIsRunning(true);
    try {
      const result = await debate.mutateAsync({ context, objective, projectName });
      setTranscript(result.turns);
    } catch {
      setTranscript([{ speaker: "Système", role: "note", tone: "neutral", text: "Le débat n’a pas pu démarrer. Vérifiez la configuration du modèle et réessayez." }]);
    } finally { setIsRunning(false); }
  };

  return <div className="min-h-screen bg-[#f7f7f4] text-[#1c1c1b]">
    <header className="h-16 border-b border-[#deded7] bg-[#fbfbf9] px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3"><div className="size-8 bg-[#20201e] text-[#f7d34b] rounded-lg grid place-items-center"><Scale className="size-4" /></div><span className="font-semibold tracking-tight">jury<span className="text-[#b49a16]">/</span>atelier</span></div>
      <div className="flex items-center gap-5 text-sm text-[#777770]"><span className="hidden md:inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#55a878]" /> session locale</span><Button variant="outline" size="sm" className="border-[#d7d7cf] bg-white"><Plus className="size-4" /> Nouveau projet</Button></div>
    </header>
    <div className="flex">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-[#deded7] min-h-[calc(100vh-4rem)] bg-[#f2f2ed] p-4 flex-col">
        <div className="text-[11px] uppercase tracking-[.16em] text-[#999990] px-3 mb-3">Espace de travail</div>
        <nav className="space-y-1"><a className="flex items-center gap-3 rounded-lg bg-[#e4e4dc] px-3 py-2.5 text-sm font-medium"><PanelLeft className="size-4" /> Synthèse</a><a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#777770] hover:bg-[#e7e7e0]"><MessageSquare className="size-4" /> Transcription</a><a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#777770] hover:bg-[#e7e7e0]"><Target className="size-4" /> Objectifs</a></nav>
        <div className="mt-auto rounded-xl bg-[#20201e] p-4 text-white"><div className="flex items-center gap-2 text-[#f7d34b] text-xs font-semibold"><Sparkles className="size-3.5" /> CONSEIL DU JURY</div><p className="text-sm leading-5 mt-3 text-[#e7e7df]">Un bon objectif se valide par un livrable observable, pas par une impression.</p></div>
      </aside>
      <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-9 py-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8"><div><div className="flex items-center gap-2 text-xs text-[#8b8b81] mb-3"><span>PROJETS</span><ChevronRight className="size-3" /><span className="text-[#1c1c1b]">{projectName}</span></div><h1 className="text-3xl md:text-[40px] font-semibold tracking-[-.04em]">Le studio de décision<span className="text-[#c2a321]">.</span></h1><p className="text-[#777770] mt-2 max-w-xl">Deux regards. Un objectif. Une conclusion que vous pouvez défendre.</p></div><Badge variant="outline" className="border-[#d7d7cf] bg-white px-3 py-1.5 font-normal"><CircleDashed className="size-3 mr-1.5 text-[#bb9e19]" /> En préparation</Badge></div>
        <div className="grid xl:grid-cols-[minmax(0,1fr)_390px] gap-6 items-start">
          <div className="space-y-6">
            <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa]"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2"><Lightbulb className="size-3.5 text-[#b49a16]" /> Brief commun</div><CardTitle className="text-lg">Ce que les agents doivent savoir</CardTitle></div><span className="text-xs text-[#a1a198]">01 / 03</span></div></CardHeader><CardContent className="pt-5"><label className="text-xs font-medium text-[#686860]">Nom du projet</label><Input value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-2 mb-4 bg-white border-[#dcdcd3]" /><label className="text-xs font-medium text-[#686860]">Contexte, contraintes et informations utiles</label><Textarea value={context} onChange={e => setContext(e.target.value)} className="mt-2 min-h-[150px] resize-none bg-white border-[#dcdcd3] leading-6" /><div className="flex justify-between items-center mt-4 text-xs text-[#9a9a90]"><span>{context.length} caractères · partagé aux deux agents</span><Button variant="ghost" size="sm" className="text-[#76766d]">Ajouter une source <ArrowUpRight className="size-3.5" /></Button></div></CardContent></Card>
            <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa]"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2"><Target className="size-3.5 text-[#b49a16]" /> Objectif actif</div><CardTitle className="text-lg">Sur quoi le jury doit trancher</CardTitle></div><Badge className="bg-[#f5edbf] text-[#77630c] hover:bg-[#f5edbf] border-0">Étape 1</Badge></div></CardHeader><CardContent className="pt-5"><Textarea value={objective} onChange={e => setObjective(e.target.value)} className="min-h-[108px] resize-none bg-white border-[#dcdcd3] text-base leading-6" /><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4"><p className="text-xs text-[#8e8e84] max-w-sm">Les agents argumentent, se contredisent et formulent un critère de validation.</p><Button onClick={runDebate} disabled={isRunning} className="bg-[#20201e] hover:bg-[#373733] text-white rounded-lg px-5">{isRunning ? <><span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Débat en cours</> : <><Play className="size-3.5 fill-current" /> Lancer le débat</>}</Button></div></CardContent></Card>
          </div>
          <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa] xl:sticky xl:top-24"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2"><Users className="size-3.5 text-[#b49a16]" /> Salle du jury</div><CardTitle className="text-lg">La discussion</CardTitle></div><span className="text-xs text-[#a1a198]">{transcript.length ? `${transcript.length} tours` : "en attente"}</span></div></CardHeader><CardContent className="pt-5"><div className="space-y-5 max-h-[500px] overflow-auto pr-1">{transcript.length === 0 ? <div className="py-12 text-center"><div className="size-12 rounded-2xl bg-[#f3efcf] grid place-items-center mx-auto mb-4"><MessageSquare className="size-5 text-[#a68a11]" /></div><p className="text-sm font-medium">Le jury attend votre brief</p><p className="text-xs text-[#999990] mt-2 leading-5">Lancez un débat pour voir les arguments apparaître ici.</p></div> : transcript.map((item, i) => <div key={i} className="flex gap-3"><div className={`size-8 rounded-full shrink-0 grid place-items-center text-xs font-semibold ${item.tone === "amber" ? "bg-[#f5edbf] text-[#78630a]" : item.tone === "green" ? "bg-[#dcefe1] text-[#39744f]" : "bg-[#e8e8e1] text-[#66665e]"}`}>{item.speaker.slice(0, 1)}</div><div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{item.speaker}</span><span className="text-[10px] uppercase tracking-wider text-[#aaa99f]">{item.role}</span></div><div className="text-sm text-[#5f5f58] leading-5 mt-1"><Streamdown>{item.text}</Streamdown></div></div></div>)}</div>{transcript.length > 0 && <div className="border-t border-[#e7e7df] mt-5 pt-4"><Button variant="outline" className="w-full border-[#d7d7cf] bg-white">Voir la synthèse <ArrowUpRight className="size-3.5" /></Button></div>}</CardContent></Card>
        </div>
        <div className="mt-7 flex items-center gap-2 text-xs text-[#92928a]"><Check className="size-3.5 text-[#5b9a70]" /> Votre brief est privé · les agents ne voient que l’espace commun</div>
      </main>
    </div>
  </div>;
}
