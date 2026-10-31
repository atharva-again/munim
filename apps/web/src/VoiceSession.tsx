import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteParticipant } from "livekit-client";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { conversationSchema, type Conversation } from "@munim/contracts";
import { conversations, type RecordingSession } from "./conversation-api";
import { buttonClass, primaryClass, StatusDot } from "./ui";
export default function VoiceSession({
  session,
  onUpdate,
  onActiveChange,
}: {
  session: RecordingSession;
  onUpdate: (state: Conversation) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const roomRef = useRef<Room | null>(null);
  const quietRef = useRef(false);
  const audioRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "idle" | "connecting" | "listening" | "thinking" | "speaking"
  >("idle");
  const [muted, setMuted] = useState(false),
    [quiet, setQuiet] = useState(false);
  const [error, setError] = useState(""),
    [partial, setPartial] = useState("");
  const onUpdateRef = useRef(onUpdate),
    onActiveRef = useRef(onActiveChange);
  onUpdateRef.current = onUpdate;
  onActiveRef.current = onActiveChange;
  useEffect(
    () => () => {
      void roomRef.current?.disconnect();
      onActiveRef.current(false);
    },
    [],
  );
  const stop = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    await room?.disconnect();
    setStatus("idle");
    onActiveRef.current(false);
    setPartial("");
  };
  const start = async () => {
    setError("");
    setStatus("connecting");
    const room = new Room({
      adaptiveStream: true,
      disconnectOnPageLeave: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    roomRef.current = room;
    let agentTimeout: ReturnType<typeof setTimeout> | undefined;
    const fail = (message: string) => {
      setError(message);
      void stop();
    };
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const audio = track.attach();
        audio.muted = quietRef.current;
        audioRef.current?.append(audio);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) =>
      track.detach().forEach((el) => el.remove()),
    );
    const agentReady = (participant: RemoteParticipant) => {
      if (participant.isAgent) {
        clearTimeout(agentTimeout);
        setStatus("listening");
      }
    };
    room.on(RoomEvent.ParticipantConnected, agentReady);
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.isAgent && roomRef.current === room)
        fail("The voice session ended. Start again to continue.");
    });
    room.on(RoomEvent.ParticipantAttributesChanged, (_, participant) => {
      if (!participant.isAgent) return;
      const state = participant.attributes["lk.agent.state"];
      setStatus(
        state === "speaking"
          ? "speaking"
          : state === "thinking"
            ? "thinking"
            : "listening",
      );
    });
    room.on(RoomEvent.DataReceived, (data, participant, _, topic) => {
      if (topic !== "munim.conversation" || !participant?.isAgent) return;
      try {
        const parsed = conversationSchema.safeParse(
          JSON.parse(new TextDecoder().decode(data)),
        );
        if (parsed.success) onUpdateRef.current(parsed.data);
      } catch {
        /* Ignore unrelated packets. */
      }
    });
    room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      if (participant?.identity === room.localParticipant.identity)
        setPartial(segments.map((s) => s.text).join(" "));
    });
    room.on(RoomEvent.Disconnected, () => {
      clearTimeout(agentTimeout);
      if (roomRef.current === room) {
        roomRef.current = null;
        setStatus("idle");
        onActiveRef.current(false);
      }
    });
    room.on(RoomEvent.MediaDevicesError, () =>
      fail("Microphone access failed. Check your browser permissions."),
    );
    try {
      const credentials = await conversations.voiceToken(session);
      if (roomRef.current !== room) return;
      await room.connect(credentials.url, credentials.token);
      if (roomRef.current !== room) {
        await room.disconnect();
        return;
      }
      await room.startAudio();
      await room.localParticipant.setMicrophoneEnabled(true);
      onActiveRef.current(true);
      setMuted(false);
      agentTimeout = setTimeout(
        () =>
          fail(
            "Munim's voice worker did not join. Check that the voice service is running.",
          ),
        25000,
      );
      room.remoteParticipants.forEach(agentReady);
    } catch (caught) {
      if (roomRef.current === room)
        fail(
          caught instanceof Error ? caught.message : "Could not connect voice.",
        );
    }
  };
  return (
    <section className="py-5" aria-label="Voice Conversation">
      <div className="flex items-center gap-2 text-xs text-muted" role="status">
        <StatusDot
          tone={
            status === "idle"
              ? "info"
              : status === "connecting"
                ? "warning"
                : "success"
          }
        />
        {status === "idle"
          ? "Voice Is Off"
          : status === "connecting"
            ? "Connecting…"
            : muted
              ? "Microphone Paused"
              : status === "speaking"
                ? "Munim Is Speaking"
                : status === "thinking"
                  ? "Thinking…"
                  : "Listening"}
      </div>
      <h2 className="mt-5 text-2xl tracking-tight">Just Say What Happened</h2>
      <p className="mt-3 text-xs leading-6 text-muted">
        Speak in Hindi, English, or Hinglish. Keep talking naturally and
        interrupt to correct anything.
      </p>
      {partial && (
        <p className="mt-4 rounded-lg bg-soft p-3 text-sm" aria-live="polite">
          {partial}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        {status === "idle" ? (
          <button
            className={primaryClass}
            type="button"
            disabled={!session.voiceConfigured}
            onClick={() => void start()}
          >
            <Mic size={16} /> Start Conversation
          </button>
        ) : (
          <>
            <button
              className={buttonClass}
              type="button"
              disabled={status === "connecting"}
              onClick={async () => {
                try {
                  await roomRef.current?.localParticipant.setMicrophoneEnabled(
                    muted,
                  );
                  setMuted(!muted);
                } catch {
                  setError(
                    "Could not change the microphone. End and restart the conversation.",
                  );
                }
              }}
            >
              {muted ? <Mic size={16} /> : <MicOff size={16} />}
              {muted ? "Resume Mic" : "Pause Mic"}
            </button>
            <button
              className={buttonClass}
              type="button"
              aria-pressed={quiet}
              onClick={() => {
                const next = !quiet;
                quietRef.current = next;
                audioRef.current?.querySelectorAll("audio").forEach((el) => {
                  el.muted = next;
                });
                setQuiet(next);
              }}
            >
              {quiet ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {quiet ? "Enable Audio" : "Mute Audio"}
            </button>
            <button
              className={buttonClass}
              type="button"
              onClick={() => void stop()}
            >
              <PhoneOff size={16} /> End Conversation
            </button>
          </>
        )}
      </div>
      {!session.voiceConfigured && (
        <p className="mt-4 text-xs leading-5 text-muted">
          Voice is awaiting LiveKit, Sarvam, and Gemini setup. You can use the
          form now.
        </p>
      )}
      {error && (
        <p className="mt-4 text-xs text-status-red" role="alert">
          {error}
        </p>
      )}
      <div ref={audioRef} className="hidden" />
    </section>
  );
}
