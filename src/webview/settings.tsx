import './styles.css';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useFieldArray, useForm } from 'react-hook-form';
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

  console.log(watch('mappings'));

  return (
    <div className="relative h-screen w-screen flex justify-center items-center overflow-hidden  bg-gradient-to-b  from-black/10 to-black/25">
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
            className="px-4 py-1 rounded border-none bg-[var(--vscode-background)] hover:bg-green-500 hover:text-green-950 transition-colors cursor-pointer min-w-16"
          >
            + Add
          </button>
          <button
            type="submit"
            disabled={!formState.isDirty}
            className="px-4 py-1 rounded border-none bg-green-500 text-green-950 transition-colors cursor-pointer min-w-8 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-transparent disabled:text-[var(--vscode-foreground)] disabled:border disabled:border-[var(--vscode-foreground)] disabled:border-solid"
          >
            Save
          </button>
        </div>

        <div className="p-6 bg-black/25 rounded-xl mt-4 shadow-2xl">
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
                    <select
                      className="bg-transparent p-0 border-none "
                      {...register(`mappings.${idx}.theme`)}
                    >
                      <option value="">Select a theme</option>
                      {allThemes.map((option) => (
                        <option key={option.id} value={option.id} className="">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="w-1/4 text-left">
                    <select
                      className="bg-transparent p-0 border-none "
                      {...register(`mappings.${idx}.iconTheme`)}
                    >
                      <option value="">Select an icon theme</option>
                      {allIconThemes.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="w-1/4 text-right">
                    <button
                      title="Remove"
                      onClick={() => removeMapping(idx)}
                      className="bg-transparent border-none rounded py-1 px-2 cursor-pointer hover:bg-red-500 transition-colors"
                    >
                      Remove
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

function Root() {
  return <SettingsPage />;
}

const rootElement = document.getElementById('root') as HTMLElement;
const root = createRoot(rootElement);
root.render(<Root />);
