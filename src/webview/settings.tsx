import './styles.css';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import type {
  getAllColorThemes,
  getAllIconThemes,
  getMappings,
  Settings,
} from '../config';

import * as moment from 'moment';
import { ensureSameDay } from '../utils';

type Themes = ReturnType<typeof getAllColorThemes>;
type IconThemes = ReturnType<typeof getAllIconThemes>;

declare const acquireVsCodeApi: () => {
  postMessage: (msg: unknown) => void;
  setState?: (state: unknown) => void;
  getState?: () => unknown | undefined;
};

const vscode = acquireVsCodeApi();

function SettingsPage() {
  const [allThemes, setAllThemes] = useState<Themes>([]);
  const [allIconThemes, setAllIconThemes] = useState<IconThemes>([]);

  const { control, setValue, handleSubmit, register, watch, formState, reset } =
    useForm<Settings>({ defaultValues: { mappings: [] } });

  const arrayFields = useFieldArray({ control, name: 'mappings' });

  useEffect(() => {
    type Message =
      | { type: 'changed'; state: ReturnType<typeof getMappings> }
      | { type: 'init-form'; themes: Themes; iconThemes: IconThemes };

    const onMessage = (event: MessageEvent) => {
      const msg = event.data as Message;

      if (msg.type === 'changed') {
        if (msg.state.length > 0) {
          const now = moment();
          setValue(
            'mappings',
            msg.state
              .map((it) => ({
                ...it,
                when: ensureSameDay(moment(it.when), now),
              }))
              .sort((a, b) => a.when.diff(b.when, 'minute'))
              .map((it) => ({
                theme: it.theme?.id ?? '',
                iconTheme: it.iconTheme?.id ?? '',
                time: moment(it.when).format('HH:mm'),
              })),
          );
        }

        return;
      }

      if (msg.type === 'init-form') {
        setAllThemes(msg.themes);
        setAllIconThemes(msg.iconThemes);
        return;
      }
    };

    const controller = new AbortController();

    window.addEventListener('message', onMessage, {
      signal: controller.signal,
    });

    return () => controller.abort();
  }, []);

  const removeMapping = (idx: number) => {
    arrayFields.remove(idx);
  };

  const addMapping = () => {
    arrayFields.append({ time: '09:00', theme: '', iconTheme: '' });
  };

  const onSave = handleSubmit(({ mappings = [] }) => {
    const filteredMappings = mappings.filter(
      (m) => !!m.time && (m.theme || m.iconTheme),
    );

    vscode.postMessage({
      type: 'save',
      mappings: filteredMappings,
    });

    reset({ mappings: filteredMappings });
  });

  return (
    <div className="relative h-screen w-screen flex justify-center items-center overflow-hidden  bg-gradient-to-b  from-black/10 to-black/35  font-[var(--vscode-font-family)] text-[var(--vscode-foreground)]">
      <form onSubmit={onSave} className="flex flex-col">
        <div className="text-center">
          <div className="font-semibold text-4xl">Theme Switcher Settings</div>
          <div className="text-[var(--vscode-descriptionForeground)] text-sm mt-4">
            Configure when to apply each theme and optional icon theme.
          </div>
        </div>

        <div className="mt-8 flex justify-between px-4">
          <button
            type="button"
            onClick={addMapping}
            className="px-4 py-1 rounded border-none bg-transparent hover:bg-[var(--vscode-button-background)] text-[var(--vscode-button-background)] hover:text-[var(--vscode-button-foreground)] transition-colors cursor-pointer min-w-16"
          >
            + Add
          </button>
          <button
            type="submit"
            disabled={!formState.isDirty}
            className="px-4 py-1 rounded border-none bg-green-500 text-[var(--vscode-button-foreground)] transition-colors cursor-pointer min-w-8 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[var(--vscode-button-background)] disabled:border disabled:border-[var(--vscode-button-background)] disabled:border-solid"
          >
            Save
          </button>
        </div>

        <div className="p-6 g bg-gradient-to-br from-0% tto-black/50 rounded-xl mt-4 shadow-2xl">
          <table className="table-fixed min-w-[640px]">
            <thead>
              <tr className="text-base">
                <th className="w-1/4 text-left">
                  Time<span className="text-red-500">*</span>
                </th>
                <th className="w-1/4 text-left">Theme</th>
                <th className="w-1/4 text-left">Icon Theme</th>
                <th className="w-1/4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {arrayFields.fields.length === 0 && (
                <tr className="w-full text-center">
                  <td colSpan={4} className="p-8 text-xl">
                    No themes configured yet!
                  </td>
                </tr>
              )}

              {arrayFields.fields.map((m, idx) => (
                <tr
                  key={m.theme + m.iconTheme + m.time}
                  className="text-sm text-[var(--vscode-foreground)]"
                >
                  <td className="w-1/4 text-left">
                    <input
                      step={60}
                      type="time"
                      {...register(`mappings.${idx}.time`)}
                      className="bg-transparent p-0 border-none font-mono"
                    />
                  </td>

                  <td className="w-1/4 text-left">
                    <Controller
                      name={`mappings.${idx}.theme`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <select
                          {...field}
                          className={`bg-transparent p-0 border-none ${field.value === '' ? 'opacity-25' : ''}`}
                        >
                          <option value="">--</option>
                          {allThemes.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </td>

                  <td className="w-1/4 text-left">
                    <Controller
                      name={`mappings.${idx}.iconTheme`}
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className={`bg-transparent p-0 border-none ${field.value === '' ? 'opacity-25' : ''}`}
                        >
                          <option value="">--</option>
                          {allIconThemes.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </td>

                  <td className="w-1/4 text-center">
                    <button
                      title="Remove"
                      onClick={() => removeMapping(idx)}
                      className="bg-transparent border-none rounded px-2 cursor-pointer transition-colors flex justify-end w-full py-2"
                    >
                      <div className="size-5 text-red-600">
                        <TrashIcon />
                      </div>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <div className="absolute w-[220px] bottom-4 right-4 animate-pulse">
        <a href="https://ko-fi.com/shyylol" target="_blank" rel="noreferrer">
          <img
            alt="Support me on Ko-fi"
            src="https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_dark.png?_gl=1*1673hhv*_gcl_au*NzUwMTY5NjA2LjE3NTQ3NTY5NTk.*_ga*ODU0MTQ1OTIwLjE3NTQ3NTY5NjA.*_ga_M13FZ7VQ2C*czE3NTQ3NTY5NTkkbzEkZzEkdDE3NTQ3NTg3NTkkajYwJGwwJGgw"
          />
        </a>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 11V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 7H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Root() {
  return <SettingsPage />;
}

const rootElement = document.getElementById('root') as HTMLElement;
const root = createRoot(rootElement);
root.render(<Root />);
