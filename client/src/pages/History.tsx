import { Link } from "wouter";
import { ArrowLeft, CalendarDays, ChevronRight, CircleDashed, FolderOpen, Plus, Scale } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusLabel: Record<string, string> = { completed: "Terminée", interrupted: "Interrompue", paused: "En pause", running: "En cours", draft: "Brouillon" };

export default function History() {
  const projects = trpc.debate.projects.useQuery(undefined, { retry: false });
  return <div className="min-h-screen bg-[#f7f7f4] text-[#1c1c1b]">
    <header className="h-16 border-b border-[#deded7] bg-[#fbfbf9] px-6 flex items-center justify-between"><Link href="/" className="flex items-center gap-3"><div className="size-8 bg-[#20201e] text-[#f7d34b] rounded-lg grid place-items-center"><Scale className="size-4" /></div><span className="font-semibold tracking-tight">jury<span className="text-[#b49a16]">/</span>atelier</span></Link><Button variant="outline" size="sm" className="border-[#d7d7cf] bg-white"><Plus className="size-4" /> Nouveau projet</Button></header>
    <main className="max-w-5xl mx-auto px-5 md:px-9 py-10"><Link href="/" className="inline-flex items-center gap-2 text-sm text-[#777770] hover:text-[#1c1c1b] mb-8"><ArrowLeft className="size-4" /> Retour au studio</Link><div className="flex items-end justify-between mb-8"><div><div className="text-xs uppercase tracking-[.16em] text-[#999990] mb-3">Archive de travail</div><h1 className="text-4xl font-semibold tracking-[-.04em]">Historique des projets<span className="text-[#c2a321]">.</span></h1><p className="text-[#777770] mt-2">Retrouvez les décisions, objectifs et séances sauvegardés.</p></div><FolderOpen className="size-8 text-[#b49a16]" /></div>
      {projects.isLoading ? <Card className="border-[#deded7] bg-[#fffefa]"><CardContent className="py-14 text-center text-sm text-[#777770]">Chargement de votre archive…</CardContent></Card> : projects.data?.length ? <div className="grid md:grid-cols-2 gap-4">{projects.data.map(project => <Link key={project.sessionKey} href={`/?session=${project.sessionKey}`}><Card className="border-[#deded7] bg-[#fffefa] hover:-translate-y-0.5 transition-transform cursor-pointer h-full"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><CardTitle className="text-lg">{project.name}</CardTitle><Badge variant="outline" className="border-[#d7d7cf] bg-white font-normal"><CircleDashed className="size-3 mr-1.5 text-[#b49a16]" />{statusLabel[project.sessionStatus] ?? project.sessionStatus}</Badge></div></CardHeader><CardContent><div className="flex items-center justify-between text-xs text-[#8d8d84]"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {new Date(project.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span><ChevronRight className="size-4" /></div></CardContent></Card></Link>)}</div> : <Card className="border-[#deded7] bg-[#fffefa]"><CardContent className="py-16 text-center"><div className="size-12 rounded-2xl bg-[#f3efcf] grid place-items-center mx-auto mb-4"><FolderOpen className="size-5 text-[#a68a11]" /></div><p className="font-medium">Aucun projet sauvegardé</p><p className="text-sm text-[#999990] mt-2">Votre premier projet apparaîtra ici après une séance.</p></CardContent></Card>}
    </main>
  </div>;
}
