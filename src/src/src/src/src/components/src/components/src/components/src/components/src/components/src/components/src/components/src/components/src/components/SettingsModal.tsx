import React from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { VoiceSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onChangeSettings: (settings: VoiceSettings) => void;
  availableVoices: SpeechSynthesisVoice[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  availableVoices,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-settings-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-left"
      >
        {/* Close Button */}
        <button
          id="btn-close-settings-modal"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-base font-semibold text-white">Settings</h2>
        <p className="text-xs text-neutral-400 mt-0.5">Configure audio and voice preferences</p>

        <div className="my-4 border-t border-neutral-800/80" />

        <div className="space-y-4">
          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-medium text-neutral-200">Auto-read responses</p>
              <p className="text-[11px] text-neutral-500">Automatically speak answers aloud</p>
            </div>
            <button
              type="button"
              id="toggle-auto-speak"
              onClick={() =>
                onChangeSettings({
                  ...settings,
                  autoSpeak: !settings.autoSpeak,
                })
              }
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                settings.autoSpeak
                  ? 'border-neutral-700 bg-neutral-800 text-white'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400'
              }`}
            >
              {settings.autoSpeak ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Off</span>
                </>
              )}
            </button>
          </div>

          {/* Voice Selector */}
          {availableVoices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Voice Selection
              </label>
              <select
                id="select-voice"
                value={settings.voiceIndex}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    voiceIndex: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 truncate"
              >
                {availableVoices.map((voice, idx) => (
                  <option key={idx} value={idx}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Speed Rate */}
          <div>
            <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
              <span>Speech Speed</span>
              <span className="text-neutral-400 font-mono">{settings.rate.toFixed(2)}x</span>
            </div>
            <input
              id="range-speech-rate"
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={settings.rate}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  rate: parseFloat(e.target.value),
                })
              }
              className="w-full accent-neutral-300"
            />
          </div>

          {/* Pitch */}
          <div>
            <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
              <span>Speech Pitch</span>
              <span className="text-neutral-400 font-mono">{settings.pitch.toFixed(2)}</span>
            </div>
            <input
              id="range-speech-pitch"
              type="range"
              min="0.75"
              max="1.2"
              step="0.05"
              value={settings.pitch}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  pitch: parseFloat(e.target.value),
                })
              }
              className="w-full accent-neutral-300"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
