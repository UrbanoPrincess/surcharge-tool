<script lang="ts">
  export let label: string;
  export let value: string;
  export let isTotal = false;
</script>

<div class="grid gap-2 rounded-2xl p-4 transition-colors hover:bg-slate-100/50 sm:grid-cols-[1fr_auto] {isTotal ? 'border border-blue-100 bg-blue-50/30' : 'bg-slate-50'}">
  <span class="flex items-start gap-2 text-sm font-medium text-slate-600 leading-snug">
    <span class="flex-1">{label}</span>
    <slot name="icon" />
  </span>
  <span class="text-right {isTotal ? 'text-xl font-bold text-blue-600' : 'text-lg font-semibold text-slate-950'}">
    {value}
  </span>
</div>