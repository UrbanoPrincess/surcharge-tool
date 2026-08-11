<script lang="ts">
  import * as Icons from 'lucide-svelte';
  
  export let title: string;
  export let iconName: keyof typeof Icons;
  export let badgeText: string = "";
  export let footerText: string = "";

  const Icon = Icons[iconName];
</script>

<section class="flex flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
  <div class="mb-5 space-y-3">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <svelte:component this={Icon} size={20} />
      </div>
      <h2 class="text-2xl font-semibold text-slate-950">{title}</h2>
    </div>

    {#if badgeText}
      <div class="inline-flex rounded-full bg-blue-100/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
        {badgeText}
      </div>
    {/if}
  </div>

  <div class="flex-1 space-y-3">
    <slot />
  </div>

  {#if footerText}
    <p class="mt-4 text-[11px] leading-relaxed text-slate-400 italic">{footerText}</p>
  {/if}
</section>