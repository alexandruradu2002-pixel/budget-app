<script lang="ts">
	import { SettingsSection } from '$lib/components';
	import { keyboardStore, KEYBOARD_SIZES, type KeyboardSize } from '$lib/stores';

	function selectSize(size: KeyboardSize) {
		keyboardStore.setSize(size);
	}
</script>

<SettingsSection title="Calculator Keyboard" description="Ajustează dimensiunea tastaturii din formularul de tranzacții">
	{#snippet icon()}
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
			/>
		</svg>
	{/snippet}

	<div class="keyboard-size-wrapper">
		<div class="size-labels">
			{#each KEYBOARD_SIZES as option}
				<span class="size-label" class:active={keyboardStore.current === option.value}>
					{option.label}
				</span>
			{/each}
		</div>
		
		<div class="slider-container">
			<input
				type="range"
				min="1"
				max="7"
				step="1"
				value={keyboardStore.current}
				oninput={(e) => selectSize(parseInt(e.currentTarget.value) as KeyboardSize)}
				class="size-slider"
			/>
			<div class="slider-track">
				{#each KEYBOARD_SIZES as _, i}
					<button 
						type="button"
						class="slider-dot" 
						class:active={keyboardStore.current >= i + 1}
						onclick={() => selectSize((i + 1) as KeyboardSize)}
						aria-label="Selectează dimensiune {KEYBOARD_SIZES[i].label}"
					></button>
				{/each}
			</div>
		</div>

		<div class="preview-section">
			<span class="preview-label">Preview</span>
			<div class="preview-keyboard">
				{#each ['7', '8', '9'] as num}
					<div 
						class="preview-key" 
						style="height: {keyboardStore.buttonHeight}px;"
					>
						{num}
					</div>
				{/each}
			</div>
		</div>
	</div>
</SettingsSection>

<style>
	.keyboard-size-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.size-labels {
		display: flex;
		justify-content: space-between;
		padding: 0 2px;
	}

	.size-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
		transition: color 0.2s ease;
		width: 32px;
		text-align: center;
	}

	.size-label.active {
		color: var(--color-primary);
		font-weight: 600;
	}

	.slider-container {
		position: relative;
		height: 32px;
		display: flex;
		align-items: center;
	}

	.size-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 6px;
		background: transparent;
		cursor: pointer;
		position: relative;
		z-index: 2;
	}

	.size-slider::-webkit-slider-runnable-track {
		width: 100%;
		height: 6px;
		background: var(--color-bg-tertiary);
		border-radius: 3px;
	}

	.size-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 24px;
		height: 24px;
		background: var(--color-primary);
		border-radius: 50%;
		cursor: pointer;
		margin-top: -9px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		transition: transform 0.15s ease;
	}

	.size-slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
	}

	.size-slider::-webkit-slider-thumb:active {
		transform: scale(0.95);
	}

	.size-slider::-moz-range-track {
		width: 100%;
		height: 6px;
		background: var(--color-bg-tertiary);
		border-radius: 3px;
	}

	.size-slider::-moz-range-thumb {
		width: 24px;
		height: 24px;
		background: var(--color-primary);
		border-radius: 50%;
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.slider-track {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		transform: translateY(-50%);
		display: flex;
		justify-content: space-between;
		padding: 0 2px;
		pointer-events: none;
	}

	.slider-dot {
		width: 12px;
		height: 12px;
		padding: 0;
		background: var(--color-bg-tertiary);
		border: 2px solid var(--color-border);
		border-radius: 50%;
		pointer-events: auto;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.slider-dot.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.preview-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.preview-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.preview-keyboard {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}

	.preview-key {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-bg-tertiary);
		border-radius: 10px;
		font-size: 18px;
		font-weight: 500;
		color: var(--color-text-primary);
		transition: height 0.2s ease;
	}
</style>
