import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUpRight, BookOpenText, Check, Keyboard, Menu, Mic, Moon, Plus, ShieldCheck, Sun, X } from "lucide-react";
import type { TransactionDraft } from "@munim/contracts";
import { useI18n } from "./i18n";
import { EntrySummary } from "./EntrySummary";
import { ChatBubble } from "./ChatBubble";

const ctaClass = "group inline-flex min-h-12 shrink-0 items-center justify-center gap-4 whitespace-nowrap rounded-full bg-fg px-6 py-3 text-sm text-canvas transition-transform duration-150 active:scale-[0.98] motion-reduce:transform-none";
const examples = [
  {label:"Part Payment",words:"Kavita Stores bought ₹800 of goods. They paid ₹300. The rest is on credit.",hi:"कविता स्टोर्स ने 800 रुपये का सामान लिया। 300 रुपये दिए, बाकी उधार हैं।",draft:{kind:"sale",direction:"inflow",amountPaise:80000,settledAmountPaise:30000,description:"Sale of goods",counterparty:"Kavita Stores",settlementStatus:"partial",displayText:{en:{description:"Sale of Goods",counterparty:"Kavita Stores"},hi:{description:"सामान की बिक्री",counterparty:"कविता स्टोर्स"}}}},
  {label:"Sale on Credit",words:"Sold ₹450 of milk to Ravi. He’ll pay later.",hi:"रवि को 450 रुपये का दूध दिया। पैसे बाद में देगा।",draft:{kind:"sale",direction:"inflow",amountPaise:45000,description:"Milk sale",counterparty:"Ravi",settlementStatus:"open",displayText:{en:{description:"Milk Sale",counterparty:"Ravi"},hi:{description:"दूध की बिक्री",counterparty:"रवि"}}}},
  {label:"Shop Expense",words:"Paid ₹1,200 cash for the shop’s electricity bill.",hi:"दुकान के बिजली बिल के लिए 1,200 रुपये नकद दिए।",draft:{kind:"expense",direction:"outflow",amountPaise:120000,description:"Electricity bill",settlementStatus:"settled",paymentMethod:"cash",displayText:{en:{description:"Electricity Bill",counterparty:""},hi:{description:"बिजली का बिल",counterparty:""}}}},
] satisfies {label:string;words:string;hi:string;draft:TransactionDraft}[];
const questions = [
  {question:"Can I Speak Hindi and English?",answer:"Yes. Speak Hindi, English, or a mix of both. Choose English or Hindi for the app’s menus and records."},
  {question:"Will Munim Ask Before Saving?",answer:"You choose. Ask for Approval lets you check each entry first. Full Autonomy saves complete entries and asks when details are missing."},
  {question:"Can I Type Instead?",answer:"Absolutely. Switch between Voice and Text in the same conversation. Your current draft comes with you."},
  {question:"Does Speaking About a Payment Move Money?",answer:"No. Munim records the payment you describe. That alone does not transfer money or verify a bank payment."},
  {question:"Does Munim Handle GST Filing?",answer:"Not currently. Munim helps capture transactions and track paid and outstanding amounts. It doesn’t replace tax filing or a full accounting system."},
];

function Example(){
  const {t,language}=useI18n();
  const [selected,setSelected]=useState(0);
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [visible,setVisible]=useState(()=>document.visibilityState==="visible");
  const progress=useRef<HTMLSpanElement>(null);
  const animation=useRef<Animation|null>(null);
  useEffect(()=>{
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange=()=>setReducedMotion(motion.matches);
    const onVisibilityChange=()=>setVisible(document.visibilityState==="visible");
    motion.addEventListener("change",onChange);
    document.addEventListener("visibilitychange",onVisibilityChange);
    return()=>{motion.removeEventListener("change",onChange);document.removeEventListener("visibilitychange",onVisibilityChange);};
  },[]);
  useEffect(()=>{
    if(reducedMotion || !progress.current)return;
    const current=progress.current.animate([{width:"0%"},{width:"100%"}],{duration:6000,easing:"linear",fill:"forwards"});
    current.pause();
    current.onfinish=()=>setSelected(index=>(index+1)%examples.length);
    animation.current=current;
    return()=>{current.onfinish=null;current.cancel();animation.current=null;};
  },[selected,reducedMotion]);
  useEffect(()=>{
    if(!animation.current)return;
    if(!visible)animation.current.pause();
    else animation.current.play();
  },[selected,reducedMotion,visible]);
  const example=examples[selected];
  return <section id="example" className="scroll-mt-24 border border-line bg-canvas">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 px-5 pt-5">
        <p className="flex items-center gap-2 text-xs text-muted"><Mic size={15}/>{t("See How It Works")}</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-2 px-5 pt-5" aria-label={t("Choose an Example")}>
        {examples.map((item,index)=><button key={item.label} type="button" aria-pressed={selected===index} onClick={()=>setSelected(index)} className="min-h-11 min-w-0 cursor-pointer text-left text-[11px] text-muted hover:text-fg">
          <span className={`block min-h-8 content-center ${selected===index?"text-fg":""}`}>{t(item.label)}</span>
          <span aria-hidden="true" className="block h-0.5 overflow-hidden bg-line">
            <span ref={selected===index?progress:undefined} className={`block h-full bg-fg ${index<selected || (index===selected && reducedMotion)?"w-full":"w-0"}`}/>
          </span>
        </button>)}
      </div>
    </div>
    <div className="grid gap-6 px-5 pb-5 sm:px-7 sm:pb-7">
      <div className="border-l-2 border-fg pl-4">
        <p className="mb-3 text-xs text-muted">{t("You Say")}</p>
        <p className="text-lg leading-relaxed tracking-tight sm:text-xl">“{language==="hi"?example.hi:example.words}”</p>
      </div>
      <div id="example-record" className="border border-line bg-soft p-5">
        <p className="flex items-center gap-2 text-xs"><Check size={15}/>{t("Munim Prepares")}</p><EntrySummary draft={example.draft}/>
      </div>
      <p className="text-[11px] leading-5 text-muted">{t("An example only. Nothing is recorded.")}</p>
    </div>
  </section>;
}

export default function LandingPage(){
  const {t,language,setLanguage}=useI18n();
  const root=useRef<HTMLDivElement>(null);
  const [menu,setMenu]=useState(false);
  const [dark,setDark]=useState(()=>document.documentElement.dataset.theme==="dark");
  useEffect(()=>{
    const preference=window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem=()=>{
      try{if(localStorage.getItem("munim-theme"))return;}catch{}
      setDark(preference.matches);
      document.documentElement.dataset.theme=preference.matches?"dark":"light";
    };
    preference.addEventListener("change",followSystem);
    return()=>preference.removeEventListener("change",followSystem);
  },[]);
  useEffect(()=>{
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const animations:Animation[]=[];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        animations.push(entry.target.animate([{opacity:0,transform:"translateY(18px)"},{opacity:1,transform:"translateY(0)"}],{duration:550,easing:"cubic-bezier(0.23,1,0.32,1)"}));
        observer.unobserve(entry.target);
      }
    },{threshold:0.12});
    root.current?.querySelectorAll("[data-reveal]").forEach(el=>observer.observe(el));
    return()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());};
  },[]);
  const toggleTheme=()=>{
    const next=!dark;setDark(next);document.documentElement.dataset.theme=next?"dark":"light";
    try{localStorage.setItem("munim-theme",next?"dark":"light");}catch{}
  };
  return <div ref={root} className="overflow-x-clip bg-canvas text-fg">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-fg focus:px-4 focus:py-3 focus:text-canvas">{t("Skip to Content")}</a>
    <header className="mx-auto flex h-20 max-w-320 items-center justify-between gap-6 px-6 lg:px-10">
      <Link to="/" aria-label={t("Munim Home")} className="flex items-center gap-2.5 text-2xl tracking-tight"><img src="/munim-logo.png" alt="" width={34} height={34} className="size-8 rounded-lg"/>munim</Link>
      <nav aria-label={t("Main Navigation")} className="hidden items-center gap-8 text-xs md:flex"><a href="#how-it-works" className="text-muted hover:text-fg">{t("How It Works")}</a><a href="#your-shop" className="text-muted hover:text-fg">{t("Made for Your Shop")}</a><a href="#questions" className="text-muted hover:text-fg">{t("Questions")}</a></nav>
      <div className="flex items-center gap-4">
        <Link to="/record" className="hidden items-center gap-3 rounded-full border border-line px-4 py-2.5 text-xs hover:bg-soft sm:inline-flex">{t("Get Started")}<ArrowUpRight size={14}/></Link>
        <button type="button" className="grid size-11 place-items-center md:hidden" aria-label={t(menu?"Close Menu":"Open Menu")} aria-expanded={menu} aria-controls="landing-menu" onClick={()=>setMenu(!menu)}>{menu?<X size={20}/>:<Menu size={20}/>}</button>
      </div>
    </header>
    {menu&&<nav id="landing-menu" aria-label={t("Mobile Navigation")} className="mx-6 mb-4 grid gap-1 rounded-2xl border border-line p-3 md:hidden">{[{href:"#how-it-works",label:"How It Works"},{href:"#your-shop",label:"Made for Your Shop"},{href:"#questions",label:"Questions"}].map(item=><a key={item.href} href={item.href} onClick={()=>setMenu(false)} className="rounded-lg p-3 text-sm hover:bg-soft">{t(item.label)}</a>)}<Link to="/record" className="rounded-lg bg-fg p-3 text-sm text-canvas">{t("Get Started")}</Link></nav>}
    <main id="main">
      <section className="mx-auto grid max-w-320 items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:gap-12 md:pb-24 md:pt-20 lg:px-10">
        <div data-reveal>
          <p className="mb-6 flex items-center gap-2 text-xs text-muted"><Mic size={15}/>{t("A Voice-First Khata for Your Shop")}</p>
          <h1 className={`max-w-150 tracking-[-0.045em] ${language==="hi"?"text-[clamp(2.8rem,5vw,4.5rem)] leading-[1.22]":"text-[clamp(3rem,5vw,4.75rem)] leading-[1.07]"}`}>{t("Say What Happened. Know What’s Due.")}</h1>
          <p className="mt-7 max-w-110 text-base leading-7 text-muted">{t("Tell Munim about a sale, purchase, or payment in Hindi or English. It prepares the entry and keeps track of what’s paid and what’s left.")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"><Link to="/record" className={ctaClass}>{t("Get Started")}<ArrowUpRight size={17}/></Link><a href="#how-it-works" className="inline-flex min-h-12 items-center gap-2 text-sm">{t("How It Works")}<ArrowDown size={15}/></a></div>
          <p className="mt-5 text-xs leading-5 text-muted">{t("Speak or type. Choose whether to review before saving.")}</p>
        </div>
        <div data-reveal className="min-w-0"><Example/></div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-320 scroll-mt-10 px-6 pb-20 lg:px-10 lg:pb-28">
        <div data-reveal className="mb-10 max-w-170"><h2 className="text-3xl leading-tight tracking-[-0.04em] sm:text-5xl">{t("Less Filling Fields. More Getting on with Business.")}</h2><p className="mt-5 max-w-xl text-sm leading-7 text-muted">{t("Tell Munim what happened in your own words. It puts the details together and asks when something is missing.")}</p></div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-5 px-1 text-xs text-muted"><p className="flex items-center gap-2"><Mic size={14}/>{t("Hindi, English, or a Bit of Both")}</p><p className="flex items-center gap-2"><Keyboard size={14}/>{t("Prefer Typing? There’s Text Too.")}</p><p className="flex items-center gap-2"><ShieldCheck size={14}/>{t("You Choose When Entries Save")}</p></div>
      </section>

      <section id="your-shop" className="border-y border-line bg-soft">
        <div className="mx-auto grid max-w-320 gap-12 px-6 py-16 md:grid-cols-[0.8fr_1fr] md:items-center lg:gap-24 lg:px-10 lg:py-24">
          <div data-reveal className="order-last md:order-first"><img src="/images/shop-shelves.webp" alt={t("Jars and shelves inside an Indian neighbourhood shop")} width={960} height={1200} loading="lazy" decoding="async" className="max-h-130 w-full rounded-3xl object-cover"/></div>
          <div data-reveal>
            <h2 className="max-w-135 text-4xl leading-[1.12] tracking-[-0.045em] sm:text-5xl">{t("Your Shop Has Its Own Language.")}</h2>
            <p className="mt-6 max-w-110 text-sm leading-7 text-muted">{t("Customer nicknames. Your usual supplier. What “one big box” means. Teach Munim once, and it can recall the context later.")}</p>
            <div className="mt-8 rounded-2xl border border-line bg-canvas p-5">
              <p className="mb-4 flex items-center gap-2 text-[11px] text-muted"><BookOpenText size={14}/>{t("Shop Memory Example")}</p>
              <ChatBubble role="user" text={t("When I say “canteen,” I mean Kavita Stores.")}/>
              <div className="mt-3"><ChatBubble role="assistant" text={t("Understood. “Canteen” means Kavita Stores.")}/></div>
            </div>
            <p className="mt-5 max-w-110 text-xs leading-6 text-muted">{t("See what Munim recalls. Correct it or ask it to forget.")}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-320 px-6 py-20 lg:px-10 lg:py-28">
        <div data-reveal className="max-w-180"><h2 className="text-4xl leading-[1.12] tracking-[-0.045em] sm:text-5xl">{t("The Sale Is Only Half the Story.")}</h2><p className="mt-5 max-w-xl text-sm leading-7 text-muted">{t("What came in? What went out? What’s still owed? Keep the answers together instead of in your head.")}</p></div>
        <div className="mt-12 grid gap-10 border-t border-line pt-8 md:grid-cols-2 md:gap-20">
          <div data-reveal><ArrowDown size={25} strokeWidth={1.4}/><h3 className="mt-5 text-xl tracking-tight">{t("Paid, Part-Paid, or Still Due")}</h3><p className="mt-3 max-w-md text-sm leading-7 text-muted">{t("Keep the total, amount paid, and balance together for each entry. Find what you need by name or status.")}</p></div>
          <div data-reveal><ShieldCheck size={25} strokeWidth={1.4}/><h3 className="mt-5 text-xl tracking-tight">{t("Your Books. Your Call.")}</h3><p className="mt-3 max-w-md text-sm leading-7 text-muted">{t("Check every entry before saving, or let complete entries save automatically. Change your preference whenever you need.")}</p></div>
        </div>
      </section>

      <section id="questions" className="mx-auto grid max-w-320 scroll-mt-10 gap-8 border-t border-line px-6 py-16 md:grid-cols-[0.65fr_1fr] lg:gap-20 lg:px-10 lg:py-24">
        <div data-reveal><h2 className="text-4xl tracking-[-0.04em]">{t("A Few Good Questions.")}</h2></div>
        <div className="divide-y divide-line">{questions.map(item=><details key={item.question} className="group py-5 first:pt-0"><summary className="flex list-none items-center justify-between gap-5 text-sm leading-6">{t(item.question)}<Plus size={17} className="shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"/></summary><p className="mt-4 max-w-xl pr-8 text-sm leading-7 text-muted">{t(item.answer)}</p></details>)}</div>
      </section>

      <section className="mx-auto max-w-320 px-6 pb-16 lg:px-10">
        <div data-reveal className="rounded-3xl border border-line bg-soft px-6 py-14 text-center sm:px-12 sm:py-20"><h2 className="text-4xl leading-[1.15] tracking-[-0.045em] sm:text-6xl">{t("Start with One Entry.")}</h2><p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted">{t("A sale, an expense, a customer’s payment. Tell Munim what happened.")}</p><Link to="/record" className={`${ctaClass} mt-8`}>{t("Get Started")}<ArrowUpRight size={17}/></Link></div>
      </section>
    </main>
    <footer className="mx-auto flex max-w-320 flex-wrap items-center justify-between gap-6 border-t border-line px-6 py-8 text-xs text-muted lg:px-10">
      <Link to="/" className="flex items-center gap-2 text-lg text-fg"><img src="/munim-logo.png" alt="" width={24} height={24} className="rounded-md"/>munim</Link><p>{t("Built for Indian Shopkeepers.")}</p><div className="flex flex-wrap items-center gap-5"><p>© {new Date().getFullYear()} munim</p><button type="button" onClick={()=>setLanguage(language==="en"?"hi":"en")} className="min-h-10 px-1 text-xs text-muted hover:text-fg" aria-label={t("Change Language")}>{language==="en"?"हिन्दी":"English"}</button><button type="button" aria-label={t(dark?"Switch to Light Mode":"Switch to Dark Mode")} onClick={toggleTheme} className="grid size-10 place-items-center rounded-full border border-line text-fg">{dark?<Sun size={15}/>:<Moon size={15}/>}</button></div>
    </footer>
  </div>;
}
