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
import { buttonClass, StatusDot } from "./ui";
type Connection = "idle" | "connecting" | "active" | "reconnecting";
const callControlClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs text-black enabled:hover:brightness-110";
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
  const lastLocalEnd = useRef<number | null>(null);
  const localWasSpeaking = useRef(false);
  const captionTurnId = useRef<string | undefined>(undefined);
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
    lastLocalEnd.current = null;
    localWasSpeaking.current = false;
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
      if (!current()) return;
      const local = participants.some((participant) => participant.isLocal);
      if (localWasSpeaking.current && !local)
        lastLocalEnd.current = performance.now();
      localWasSpeaking.current = local;
      setUserSpeaking(local);
      if (
        participants.some((participant) => participant.isAgent) &&
        lastLocalEnd.current !== null
      ) {
        const durationMs = performance.now() - lastLocalEnd.current;
        lastLocalEnd.current = null;
        void conversations
          .telemetry(session, {
            stage: "client_audio_gap",
            durationMs,
            turnId: captionTurnId.current,
          })
          .catch(() => {});
      }
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
          captionTurnId.current = caption.data.turnId;
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
  const circleLabel = joining ? "Cancel" : connected ? "End" : "Start Talking";
  const communicating =
    connected && !muted && (userSpeaking || processing || speaking);
  return (
    <section className="py-6 sm:py-9" aria-label={t("Voice Conversation")}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
        <div className="flex shrink-0 flex-col items-center gap-3 self-center">
          <button
            type="button"
            aria-label={t(circleLabel)}
            aria-pressed={connected}
            disabled={!session.voiceConfigured}
            onClick={() => {
              if (connected || joining) {
                setError("");
                void stop();
              } else void start();
            }}
            className={
              "grid size-24 place-items-center rounded-full border transition-colors motion-reduce:transition-none sm:size-28 " +
              (connected
                ? "border-fg bg-soft text-fg"
                : "border-fg bg-fg text-canvas enabled:hover:bg-fg/85")
            }
          >
            {joining ? (
              <LoaderCircle
                size={30}
                strokeWidth={1.4}
                className="motion-safe:animate-spin"
              />
            ) : connected ? (
              <PhoneOff size={30} strokeWidth={1.4} />
            ) : (
              <Mic size={32} strokeWidth={1.4} />
            )}
          </button>
          <p className="text-[11px] text-muted">{t(circleLabel)}</p>
        </div>
        <div
          className="min-w-0 flex-1 rounded-3xl border border-line bg-soft px-5 py-5 sm:px-6"
          aria-label={t("Current Conversation")}
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className="flex items-center gap-2 text-xs text-muted"
              role="status"
              aria-live="polite"
            >
              {connected && <StatusDot tone={muted ? "warning" : "success"} />}
              {t(title)}
            </p>
            {communicating && (
              <span className="flex gap-1" aria-hidden="true">
                <span className="size-1 rounded-full bg-fg motion-safe:animate-pulse" />
                <span className="size-1 rounded-full bg-fg motion-safe:animate-pulse [animation-delay:180ms]" />
                <span className="size-1 rounded-full bg-fg motion-safe:animate-pulse [animation-delay:360ms]" />
              </span>
            )}
          </div>
          {started && (exchange.user || exchange.assistant) ? (
            <div className="mt-4 grid gap-3">
              {exchange.user && (
                <div>
                  <p className="text-[10px] text-muted">{t("You")}</p>
                  <p className="mt-1 max-h-24 overflow-y-auto break-words text-sm leading-7">
                    {exchange.user}
                  </p>
                </div>
              )}
              {exchange.assistant && (
                <div>
                  <p className="text-[10px] text-muted">{t("Munim")}</p>
                  <p className="mt-1 max-h-32 overflow-y-auto break-words text-sm leading-7">
                    {exchange.assistant}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs leading-6 text-muted">
              {t(
                joining
                  ? helper
                  : started
                    ? "Tell me what happened. You can keep talking naturally."
                    : "Tap the circle and tell Munim what happened.",
              )}
            </p>
          )}
        </div>
      </div>
      {connected && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:pl-35">
          <button
            type="button"
            className={
              callControlClass +
              (muted ? " bg-status-green" : " bg-status-yellow")
            }
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
            className={callControlClass + " bg-status-red"}
            onClick={() => {
              setError("");
              void stop();
            }}
          >
            <PhoneOff size={15} />
            {t("End")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-xs leading-6 text-status-red">
          {t(error)}
        </p>
      )}
      {(error || !session.voiceConfigured) && (
        <button
          type="button"
          className={buttonClass + " mt-3"}
          onClick={onChooseText}
        >
          <Keyboard size={14} />
          {t("Type Instead")}
        </button>
      )}
      {audioBlocked && connected && (
        <button
          type="button"
          className={buttonClass + " mt-3"}
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
          <Volume2 size={14} />
          {t("Enable Sound")}
        </button>
      )}
      {connected && (
        <details className="group mt-4 text-xs text-muted">
          <summary className="flex w-fit list-none items-center gap-2 rounded-md py-2">
            {t("More Controls")}
            <ChevronDown size={13} className="group-open:rotate-180" />
          </summary>
          <button
            type="button"
            className={buttonClass}
            aria-pressed={quiet}
            onClick={() => {
              const next = !quiet;
              quietRef.current = next;
              audioRef.current?.querySelectorAll("audio").forEach((element) => {
                element.muted = next;
              });
              setQuiet(next);
            }}
          >
            {quiet ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {t(quiet ? "Unmute Voice" : "Mute Voice")}
          </button>
        </details>
      )}
      {!started && (
        <p className="mt-4 text-center text-[11px] text-muted sm:text-left sm:pl-35">
          {t(
            session.conversation.approvalMode === "autonomous"
              ? "Saves Automatically"
              : "I’ll Ask Before Saving",
          )}
        </p>
      )}
      <div ref={audioRef} className="hidden" />
    </section>
  );
}
