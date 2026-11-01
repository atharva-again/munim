import { useI18n } from "./i18n";
const times={en:new Intl.DateTimeFormat("en-IN",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Kolkata"}),hi:new Intl.DateTimeFormat("hi-IN",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Kolkata"})};
export function ChatBubble({role,text,at}:{role:"user"|"assistant";text:string;at?:number}) {
  const {t,language}=useI18n();
  const outgoing=role==="user";
  return <div className={outgoing ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-fg px-4 py-2.5 text-canvas" : "mr-auto w-fit max-w-[85%] rounded-2xl rounded-tl-sm border border-line bg-soft px-4 py-2.5 text-fg"}>
    <span className="sr-only">{t(outgoing?"You":"Munim")}: </span>
    <p className="whitespace-pre-wrap break-words text-sm leading-7">{text}</p>
    {at!==undefined && <p className="mt-1 text-right text-[10px] opacity-60">{times[language].format(at)}</p>}
  </div>;
}
