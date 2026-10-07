'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MessageTemplate } from '@/types/whatsapp';
import { Step1ChooseTemplate } from '@/components/whatsapp/broadcasts/step1-choose-template';
import { Step2SelectAudience } from '@/components/whatsapp/broadcasts/step2-select-audience';
import { Step3Personalize } from '@/components/whatsapp/broadcasts/step3-personalize';
import { Step4ScheduleSend } from '@/components/whatsapp/broadcasts/step4-schedule-send';
import { useBroadcastSending, type AudienceConfig, type VariableMapping } from '@/hooks/whatsapp/use-broadcast-sending';
import { cn } from '@/lib/whatsapp/utils';

const steps = ['template', 'audience', 'personalize', 'send'] as const;

function defaultBroadcastName(template: MessageTemplate) {
  const pretty = template.name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date());
  return `${pretty} – ${date}`;
}

// No "Save as draft": a saved draft couldn't be reopened in this wizard,
// so it only created rows that could be viewed or deleted.
export default function NewBroadcastPage() {
  const router = useRouter();
  const t = useTranslations('Broadcasts.new');
  const { createAndSendBroadcast, isProcessing, sentSoFar, totalToSend } = useBroadcastSending();

  const [currentStep, setCurrentStep] = useState(0);
  const [template, setTemplate] = useState<MessageTemplate | null>(null);
  const [audience, setAudience] = useState<AudienceConfig>({ type: 'all' });
  const [variables, setVariables] = useState<Record<string, VariableMapping>>({});
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [name, setName] = useState('');

  // The send runs from this tab: block in-app navigation (sidebar links etc.)
  // while it's in progress. Tab close/refresh is guarded in step 4.
  useEffect(() => {
    if (!isProcessing) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest('a[href]');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      toast.warning('A broadcast is sending — stay on this page until it finishes.');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isProcessing]);

  function goTo(step: number) {
    if (step === 3 && template && !name.trim()) setName(defaultBroadcastName(template));
    setCurrentStep(step);
  }

  async function handleSend() {
    if (!template) return;
    try {
      const broadcastId = await createAndSendBroadcast({ name: name.trim(), template, audience, variables, headerMediaUrl });
      router.push(`/whatsapp/broadcasts/${broadcastId}`);
    } catch (err) {
      console.error('Broadcast failed:', err);
      toast.error(err instanceof Error ? err.message : 'Broadcast failed');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <nav aria-label="Broadcast steps">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const label = t(`steps.${step}`);
            return (
              <li key={step} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => isCompleted && !isProcessing && goTo(index)}
                  disabled={!isCompleted || isProcessing}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${label}${isCompleted ? ' (completed — go back)' : ''}`}
                  className={cn('flex items-center gap-2 rounded-full', isCompleted && 'cursor-pointer hover:opacity-80')}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition',
                      isCompleted
                        ? 'bg-foreground text-background'
                        : isActive
                          ? 'border-2 border-foreground text-foreground'
                          : 'border border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium sm:text-sm',
                      isActive ? 'text-foreground' : 'text-muted-foreground',
                      !isActive && 'hidden sm:inline'
                    )}
                  >
                    {label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <span className={cn('mx-3 h-px flex-1', index < currentStep ? 'bg-foreground' : 'bg-border')} aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="relative min-h-[400px]">
        {currentStep === 0 && (
          <Step1ChooseTemplate
            selectedTemplate={template}
            onSelect={setTemplate}
            onNext={() => goTo(1)}
            onBack={() => router.push('/whatsapp/broadcasts')}
          />
        )}
        {currentStep === 1 && (
          <Step2SelectAudience audience={audience} onUpdate={setAudience} onNext={() => goTo(2)} onBack={() => goTo(0)} />
        )}
        {currentStep === 2 && template && (
          <Step3Personalize
            template={template}
            variables={variables}
            onUpdate={setVariables}
            headerMediaUrl={headerMediaUrl}
            onHeaderMediaUrlChange={setHeaderMediaUrl}
            onNext={() => goTo(3)}
            onBack={() => goTo(1)}
          />
        )}
        {currentStep === 3 && template && (
          <Step4ScheduleSend
            name={name}
            onNameChange={setName}
            template={template}
            audience={audience}
            variables={variables}
            headerMediaUrl={headerMediaUrl}
            onSend={handleSend}
            onBack={() => goTo(2)}
            isProcessing={isProcessing}
            sentSoFar={sentSoFar}
            totalToSend={totalToSend}
          />
        )}
      </div>
    </div>
  );
}
