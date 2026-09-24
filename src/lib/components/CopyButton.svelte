<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Check, Copy } from '@lucide/svelte';

	/**
	 * Copies `value` to the clipboard, icon only: the value sits in the same
	 * block, so this is the shortcut rather than the only way to get it — and
	 * that block scrolls instead of wrapping, which is exactly when a click
	 * beats dragging a selection.
	 *
	 * The tick is the confirmation. A refused clipboard (an insecure origin, a
	 * denied permission) tints the icon instead of claiming a copy that did not
	 * happen; the value is still on screen to select by hand.
	 *
	 * `ariaLabel` names what is being copied: a panel with two of these, both
	 * announcing "Copy", tells a screen reader nothing about which is which.
	 */
	let { value, ariaLabel }: { value: string; ariaLabel: string } = $props();

	let state = $state<'idle' | 'copied' | 'failed'>('idle');
	let timer: ReturnType<typeof setTimeout> | null = null;
	onDestroy(() => {
		if (timer) clearTimeout(timer);
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			state = 'copied';
		} catch {
			state = 'failed';
		}
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => (state = 'idle'), 2000);
	}
</script>

<button
	type="button"
	onclick={copy}
	aria-label={ariaLabel}
	class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors {state ===
	'failed'
		? 'text-red-600'
		: 'text-stone-400'} hover:bg-stone-200/70 hover:text-stone-900"
>
	{#if state === 'copied'}
		<Check class="h-4 w-4 text-emerald-600" />
	{:else}
		<Copy class="h-4 w-4" />
	{/if}
</button>
<div class="sr-only" role="status" aria-live="polite" data-testid="copy-status">
	{state === 'copied'
		? 'Copied to clipboard'
		: state === 'failed'
			? 'Copy failed — select the text instead'
			: ''}
</div>
