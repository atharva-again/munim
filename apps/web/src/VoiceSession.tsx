import { useEffect, useRef, useState } from "react";
import {
  createLocalAudioTrack,
  Room,
  RoomEvent,
  Track,
  type LocalAudioTrack,
  type Participant,
} from "livekit-client";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  ChevronDown,
  LoaderCircle,
  RotateCcw,
  Keyboard,
} from "lucide-react";
import { z } from "zod";
import {
  voiceActivitySchema,
  voiceCaptionSchema,
  type Conversation,
} from "@munim/contracts";
import { conversations, type RecordingSession } from "./conversation-api";
import { useI18n } from "./i18n";
import { buttonClass, primaryClass, StatusDot } from "./ui";
type Connection = "idle" | "connecting" | "active" | "reconnecting";
export default function VoiceSession({
  session,
  onUpdate,
  onActiveChange,
  onChooseText,
  onProcessingChange,
}: {
  session: RecordingSession;
  onUpdate: (state: Conversation) => void;
  onActiveChange: (active: boolean) => void;
  onChooseText: () => void;
  onProcessingChange: (processing: boolean) => void;
}) {
  const { t } = useI18n();
  const roomRef = useRef<Room | null>(null),
    cleanupRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLDivElement>(null),
    quietRef = useRef(false);
  const onUpdateRef = useRef(onUpdate),
    onActiveRef = useRef(onActiveChange);
  const onProcessingRef = useRef(onProcessingChange);
  onProcessingRef.current = onProcessingChange;
  onUpdateRef.current = onUpdate;
  onActiveRef.current = onActiveChange;
  const [connection, setConnection] = useState<Connection>("idle");
  const [muted, setMuted] = useState(false),
    [quiet, setQuiet] = useState(false);
  const [awaitingPermission, setAwaitingPermission] = useState(false);
  const [processing, setProcessing] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [userSpeaking, setUserSpeaking] = useState(false);
  const [error, setError] = useState(""),
    [started, setStarted] = useState(false);
  const [exchange, setExchange] = useState({ user: "", assistant: "" });
  const [audioBlocked, setAudioBlocked] = useState(false);
  useEffect(() => {
    onProcessingRef.current(processing || (userSpeaking && !muted));
  }, [processing, userSpeaking, muted]);
  useEffect(() => {
    if (session.conversation.phase === "processing") setProcessing(true);
    else if (
      session.conversation.phase === "saved" ||
      session.conversation.messages.at(-1)?.role === "assistant"
    )
      setProcessing(false);
  }, [session.conversation.phase, session.conversation.revision]);
  const stop = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    audioRef.current?.replaceChildren();
    setConnection("idle");
    setProcessing(false);
    setSpeaking(false);
    setUserSpeaking(false);
    onActiveRef.current(false);
    onProcessingRef.current(false);
    await room?.disconnect();
  };
  useEffect(
    () => () => {
      const room = roomRef.current;
      roomRef.current = null;
      cleanupRef.current?.();
      cleanupRef.current = null;
      audioRef.current?.replaceChildren();
      onActiveRef.current(false);
      onProcessingRef.current(false);
      void room?.disconnect();
    },
    [],
  );
  useEffect(() => {
    const room = roomRef.current;
    if (!room || session.conversation.phase !== "saved") return;
    void room.localParticipant
      .publishData(
        new TextEncoder().encode(
          JSON.stringify({ id: session.conversation.id }),
        ),
        { reliable: true, topic: "munim.entry.saved" },
      )
      .catch(() => {});
  }, [
    session.conversation.phase,
    session.conversation.transactionId,
    session.conversation.id,
  ]);
  const start = async () => {
    if (roomRef.current) return;
    setError("");
    setAwaitingPermission(true);
    setConnection("connecting");
    setStarted(true);
    setProcessing(false);
    setSpeaking(false);
    setUserSpeaking(false);
    setMuted(false);
    setExchange({ user: "", assistant: "" });
    setAudioBlocked(false);
    const room = new Room({
      adaptiveStream: true,
      disconnectOnPageLeave: true,
    });
    roomRef.current = room;
    let microphone: LocalAudioTrack | undefined;
    let agentTimeout: ReturnType<typeof setTimeout> | undefined;
    let resolveReady: (ready: boolean) => void = () => {};
    let agentFound = false;
    const ready = new Promise<boolean>((resolve) => {
      resolveReady = resolve;
    });
    cleanupRef.current = () => {
      clearTimeout(agentTimeout);
      resolveReady(false);
      room.removeAllListeners();
      microphone?.stop();
    };
    const current = () => roomRef.current === room;
    const fail = (message: string) => {
      if (!current()) return;
      setError(message);
      void stop();
    };
    const agentState = (participant: Participant) => {
      if (!current() || !participant.isAgent) return;
      setSpeaking(participant.attributes["lk.agent.state"] === "speaking");
    };
    const agentReady = (participant: Participant) => {
      if (!current() || !participant.isAgent) return;
      agentState(participant);
      if (
        !["listening", "speaking", "thinking"].includes(
          participant.attributes["lk.agent.state"] ?? "",
        )
      )
        return;
      agentFound = true;
      clearTimeout(agentTimeout);
      agentState(participant);
      resolveReady(true);
    };
    room.on(RoomEvent.ParticipantConnected, agentReady);
    room.on(RoomEvent.ParticipantAttributesChanged, (_, participant) =>
      agentReady(participant),
    );
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.isAgent)
        fail("This conversation ended. Start again to continue.");
    });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (!current() || track.kind !== Track.Kind.Audio) return;
      const audio = track.attach();
      audio.muted = quietRef.current;
      audioRef.current?.append(audio);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) =>
      track.detach().forEach((element) => element.remove()),
    );
    room.on(RoomEvent.ActiveSpeakersChanged, (participants) => {
      if (current())
        setUserSpeaking(
          participants.some((participant) => participant.isLocal),
        );
    });
    room.on(RoomEvent.Reconnecting, () => {
      if (current()) setConnection("reconnecting");
    });
    room.on(RoomEvent.Reconnected, () => {
      if (!current()) return;
      setConnection("active");
      void conversations
        .get(session)
        .then((state) => {
          if (current()) {
            setProcessing(state.phase === "processing");
            onUpdateRef.current(state);
          }
        })
        .catch(() => {
          if (current()) setError("Could not refresh your draft.");
        });
    });
    room.on(RoomEvent.Disconnected, () => {
      if (current()) fail("This conversation ended. Start again to continue.");
    });
    room.on(RoomEvent.MediaDevicesError, () =>
      fail(
        "Your microphone is blocked. Allow it in your browser, then try again.",
      ),
    );
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (current()) setAudioBlocked(!room.canPlaybackAudio);
    });
    room.on(RoomEvent.DataReceived, (data, participant, _, topic) => {
      if (!current() || !participant?.isAgent) return;
      try {
        const payload: unknown = JSON.parse(new TextDecoder().decode(data));
        if (topic === "munim.voice") {
          const event = voiceActivitySchema.safeParse(payload);
          if (!event.success || event.data.id !== session.conversation.id)
            return;
          if (event.data.state === "ready" && !agentFound) {
            agentFound = true;
            clearTimeout(agentTimeout);
            resolveReady(true);
          }
          setProcessing(event.data.state === "processing");
          if (event.data.state === "processing") setError("");
          if (event.data.state === "error")
            setError("That didn’t work. Please say it again or type it.");
          if (event.data.state === "audio-error")
            setError("I couldn’t play that reply. You can read it on screen.");
        } else if (topic === "munim.caption") {
          const caption = voiceCaptionSchema.safeParse(payload);
          if (!caption.success || caption.data.id !== session.conversation.id)
            return;
          const { role, text } = caption.data;
          setExchange((previous) =>
            role === "user"
              ? { user: text, assistant: "" }
              : { ...previous, assistant: text },
          );
        } else if (topic === "munim.conversation") {
          const update = z
            .object({ id: z.string().uuid(), revision: z.number().int() })
            .safeParse(payload);
          if (!update.success || update.data.id !== session.conversation.id)
            return;
          void conversations
            .get(session)
            .then((state) => {
              if (current()) {
                setProcessing(false);
                onUpdateRef.current(state);
              }
            })
            .catch(() => {
              if (current()) setError("Could not refresh your draft.");
            });
        }
      } catch {}
    });
    try {
      await room.startAudio();
      microphone = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      if (!current()) {
        microphone.stop();
        return;
      }
      setAwaitingPermission(false);
      const credentials = await conversations.voiceToken(session);
      if (!current()) return;
      await room.connect(credentials.url, credentials.token);
      if (!current()) {
        await room.disconnect();
        return;
      }
      room.remoteParticipants.forEach(agentReady);
      if (!agentFound)
        agentTimeout = setTimeout(() => {
          if (current())
            fail("Munim couldn’t connect. Try again or type your entry.");
        }, 25000);
      if (!(await ready) || !current()) return;
      await room.localParticipant.publishTrack(microphone, {
        source: Track.Source.Microphone,
      });
      if (!current()) {
        microphone.stop();
        await room.disconnect();
        return;
      }
      setConnection("active");
      onActiveRef.current(true);
    } catch (caught) {
      if (!current()) return;
      const permission =
        caught instanceof Error &&
        ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(
          caught.name,
        );
      console.warn("[voice-connect]", {
        reason: caught instanceof Error ? caught.name : "unknown",
      });
      fail(
        permission
          ? "Your microphone is blocked. Allow it in your browser, then try again."
          : "Munim couldn’t connect. Try again or type your entry.",
      );
    }
  };
  const connected = connection === "active";
  const joining = connection === "connecting" || connection === "reconnecting";
  const title = !session.voiceConfigured
    ? "Voice Is Unavailable"
    : joining
      ? "Getting Ready…"
      : !connected
        ? error
          ? "Couldn’t Connect"
          : started
            ? "Conversation Ended"
            : "Ready to Talk?"
        : muted
          ? "Microphone Paused"
          : speaking
            ? "Munim Is Speaking"
            : processing
              ? "One Moment…"
              : userSpeaking
                ? "I’m Listening"
                : "You Can Speak Now";
  const helper = joining
    ? awaitingPermission
      ? "Allow microphone access when your browser asks."
      : "Connecting to Munim…"
    : !connected
      ? started
        ? ""
        : "Start once, then talk naturally."
      : muted
        ? "Resume when you’re ready to speak."
        : speaking
          ? "Listen to the reply, or speak to add something."
          : processing
            ? "I’m checking the details."
            : "Tell me what happened. You can keep talking naturally.";
  const previousUser = session.conversation.messages
    .filter((message) => message.role === "user")
    .at(-1)?.text;
  const previousReply = session.conversation.messages.at(-1);
  const userText = started ? exchange.user : previousUser;
  const assistantText = started
    ? exchange.assistant
    : previousReply?.role === "assistant"
      ? previousReply.text
      : "";
  return (
    <section className="pt-6" aria-label={t("Voice Conversation")}>
      <div className="flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm">{t("Talk to Munim")}</h2>
          <p
            className="flex items-center gap-2 text-[11px] text-muted"
            role="status"
            aria-live="polite"
          >
            {joining || (processing && !speaking) ? (
              <LoaderCircle size={13} className="motion-safe:animate-spin" />
            ) : connected ? (
              <StatusDot tone={muted ? "warning" : "success"} />
            ) : null}
            {t(title)}
          </p>
        </header>
        {helper && (
          <p className="mt-2 text-[11px] leading-5 text-muted">{t(helper)}</p>
        )}
        <div
          className="grid min-h-64 content-center gap-7 py-8 sm:gap-9 sm:py-10"
          role="region"
          aria-label={t("Current Conversation")}
        >
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6">
            <p className="pt-1 text-[11px] text-muted">
              {t(!started && !userText ? "Example" : "You")}
            </p>
            <p
              className={`break-words text-base leading-7 ${userText ? "text-fg" : "text-muted"}`}
            >
              {userText ||
                t(
                  started
                    ? "Your words will appear here when you pause."
                    : "Ramesh took ₹500 of milk on credit.",
                )}
            </p>
          </div>
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6">
            <p className="pt-1 text-[11px] text-muted">{t("Munim")}</p>
            <p
              className={`break-words text-base leading-7 ${assistantText ? "text-fg" : "text-muted"}`}
            >
              {assistantText ||
                t(
                  processing
                    ? "I’m checking the details."
                    : "My reply will appear here.",
                )}
            </p>
          </div>
        </div>
        {error && (
          <p role="alert" className="mb-4 text-xs leading-6 text-status-red">
            {t(error)}
          </p>
        )}
        {audioBlocked && connected && (
          <button
            type="button"
            className={`${buttonClass} mb-4 self-start`}
            onClick={() =>
              void roomRef.current
                ?.startAudio()
                .catch(() =>
                  setError(
                    "Your browser blocked sound. Enable sound, then try again.",
                  ),
                )
            }
          >
            <Volume2 size={15} />
            {t("Enable Sound")}
          </button>
        )}
        <div className="flex min-h-17 flex-wrap items-center gap-2 border-t border-line py-4">
          {!session.voiceConfigured ? (
            <button
              type="button"
              className={primaryClass}
              onClick={onChooseText}
            >
              <Keyboard size={15} />
              {t("Type Instead")}
            </button>
          ) : !connected && !joining ? (
            <button
              type="button"
              className={primaryClass}
              disabled={!session.voiceConfigured}
              onClick={() => void start()}
            >
              {started ? <RotateCcw size={15} /> : <Mic size={15} />}
              {t(started ? "Start Again" : "Start Talking")}
            </button>
          ) : joining ? (
            <button
              type="button"
              className={buttonClass}
              onClick={() => void stop()}
            >
              {t("Cancel")}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={buttonClass}
                aria-pressed={muted}
                onClick={async () => {
                  const room = roomRef.current;
                  if (!room) return;
                  try {
                    await room.localParticipant.setMicrophoneEnabled(muted);
                    setMuted(!muted);
                  } catch {
                    setError(
                      "Your microphone is blocked. Allow it in your browser, then try again.",
                    );
                  }
                }}
              >
                {muted ? <Mic size={15} /> : <MicOff size={15} />}
                {t(muted ? "Resume" : "Pause")}
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setError("");
                  void stop();
                }}
              >
                <PhoneOff size={15} />
                {t("End")}
              </button>
            </>
          )}
          {error && (
            <button
              type="button"
              className={buttonClass}
              onClick={onChooseText}
            >
              <Keyboard size={15} />
              {t("Type Instead")}
            </button>
          )}
        </div>
        {!session.voiceConfigured ? (
          <p className="mt-1 text-xs leading-6 text-muted">
            {t(
              "Voice isn’t available right now. You can type or use the form.",
            )}
          </p>
        ) : (
          !started && (
            <p className="mt-1 text-[11px] text-muted">
              {t(
                session.conversation.approvalMode === "autonomous"
                  ? "Saves Automatically"
                  : "I’ll Ask Before Saving",
              )}
            </p>
          )
        )}
        {connected && !quiet && (
          <details className="group mt-1 self-start text-xs text-muted">
            <summary className="flex list-none items-center gap-2 rounded-md py-2 hover:text-fg">
              {t("More Controls")}
              <ChevronDown
                size={13}
                className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <button
              type="button"
              className={`${buttonClass} mt-2`}
              aria-pressed={quiet}
              onClick={() => {
                const next = !quiet;
                quietRef.current = next;
                audioRef.current
                  ?.querySelectorAll("audio")
                  .forEach((element) => {
                    element.muted = next;
                  });
                setQuiet(next);
              }}
            >
              {quiet ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {t(quiet ? "Unmute Voice" : "Mute Voice")}
            </button>
          </details>
        )}
        {connected && quiet && (
          <button
            type="button"
            className="mt-1 flex items-center gap-2 self-start rounded-md py-2 text-xs text-muted hover:text-fg"
            onClick={() => {
              quietRef.current = false;
              audioRef.current?.querySelectorAll("audio").forEach((element) => {
                element.muted = false;
              });
              setQuiet(false);
            }}
          >
            <VolumeX size={14} />
            {t("Unmute Voice")}
          </button>
        )}
      </div>
      <div ref={audioRef} className="hidden" />
    </section>
  );
}
