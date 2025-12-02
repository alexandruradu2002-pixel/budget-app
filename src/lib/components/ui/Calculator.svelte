<script lang="ts">
	/**
	 * Simple calculator keyboard component for entering amounts
	 */
	
	let {
		value = $bindable('0'),
		onInput = (val: string) => {}
	} = $props();
	
	let isNewInput = $state(true);
	
	function calcInput(digit: string) {
		if (isNewInput || value === '0') {
			value = digit;
			isNewInput = false;
		} else {
			// Limit to reasonable amount (max 999,999,999)
			if (value.length >= 9) return;
			value += digit;
		}
		onInput(value);
	}

	function calcBackspace() {
		if (value.length > 1) {
			value = value.slice(0, -1);
		} else {
			value = '0';
			isNewInput = true;
		}
		onInput(value);
	}

	function calcClear() {
		value = '0';
		isNewInput = true;
		onInput(value);
	}
	
	// Reset new input state when value changes externally
	$effect(() => {
		if (value === '0') {
			isNewInput = true;
		}
	});
</script>

<div class="calculator">
	<div class="calc-grid">
		<!-- Row 1 -->
		<button type="button" onclick={() => calcInput('7')} class="calc-btn number">7</button>
		<button type="button" onclick={() => calcInput('8')} class="calc-btn number">8</button>
		<button type="button" onclick={() => calcInput('9')} class="calc-btn number">9</button>
		
		<!-- Row 2 -->
		<button type="button" onclick={() => calcInput('4')} class="calc-btn number">4</button>
		<button type="button" onclick={() => calcInput('5')} class="calc-btn number">5</button>
		<button type="button" onclick={() => calcInput('6')} class="calc-btn number">6</button>
		
		<!-- Row 3 -->
		<button type="button" onclick={() => calcInput('1')} class="calc-btn number">1</button>
		<button type="button" onclick={() => calcInput('2')} class="calc-btn number">2</button>
		<button type="button" onclick={() => calcInput('3')} class="calc-btn number">3</button>
		
		<!-- Row 4 -->
		<button type="button" onclick={() => calcInput('0')} class="calc-btn number span-2">0</button>
		<button type="button" aria-label="Backspace" onclick={calcBackspace} class="calc-btn backspace">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
			</svg>
		</button>
	</div>
</div>

<style>
	.calculator {
		background: var(--color-bg-secondary);
		padding: 8px;
		padding-bottom: calc(8px + env(safe-area-inset-bottom));
	}

	.calc-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		max-width: 100%;
	}

	.calc-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 52px;
		border: none;
		border-radius: 8px;
		font-size: 20px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.calc-btn.number {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.calc-btn.number:hover {
		background: var(--color-border);
	}

	.calc-btn.number:active {
		transform: scale(0.95);
	}

	.calc-btn.span-2 {
		grid-column: span 2;
	}

	.calc-btn.backspace {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}

	.calc-btn.backspace:hover {
		background: var(--color-border);
	}

	.calc-btn.backspace svg {
		width: 24px;
		height: 24px;
	}
</style>
