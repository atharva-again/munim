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
import { voiceActivitySchema, type Conversation } from "@munim/contracts";
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
        : "For example: “Ramesh took ₹500 of milk on credit.”"
      : muted
        ? "Resume when you’re ready to speak."
        : speaking
          ? "Listen to the reply, or speak to add something."
          : processing
            ? "I’m checking the details."
            : "Tell me what happened. You can keep talking naturally.";
  return (
    <section className="py-7 sm:py-10" aria-label={t("Voice Conversation")}>
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        {(connected || joining) && (
          <div
            aria-hidden="true"
            className={`grid size-20 place-items-center rounded-full border bg-soft transition-colors motion-reduce:transition-none ${connected && userSpeaking && !muted ? "border-fg" : "border-line"}`}
          >
            {joining || (processing && connected && !speaking && !muted) ? (
              <LoaderCircle
                size={28}
                strokeWidth={1.4}
                className="motion-safe:animate-spin"
              />
            ) : muted ? (
              <MicOff size={28} strokeWidth={1.4} />
            ) : (
              <Mic size={28} strokeWidth={1.4} />
            )}
          </div>
        )}
        <h2
          className="mt-5 flex items-center gap-2 text-xl tracking-tight"
          role="status"
          aria-live="polite"
        >
          {connected && <StatusDot tone={muted ? "warning" : "success"} />}
          {t(title)}
        </h2>
        {helper && (
          <p className="mt-2 text-xs leading-6 text-muted">{t(helper)}</p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs leading-6 text-status-red">
            {t(error)}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
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
          <p className="mt-4 text-xs leading-6 text-muted">
            {t(
              "Voice isn’t available right now. You can type or use the form.",
            )}
          </p>
        ) : (
          !started && (
            <p className="mt-4 text-[11px] text-muted">
              {t(
                session.conversation.approvalMode === "autonomous"
                  ? "Saves Automatically"
                  : "I’ll Ask Before Saving",
              )}
            </p>
          )
        )}
        {connected && !quiet && (
          <details className="group mt-5 text-xs text-muted">
            <summary className="flex list-none items-center justify-center gap-2 rounded-md px-3 py-2 hover:text-fg">
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
            className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted hover:text-fg"
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
