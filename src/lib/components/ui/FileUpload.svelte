<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id: string;
		label: string;
		description?: string;
		required?: boolean;
		accept?: string;
		file: File | null;
		onchange: (file: File | null) => void;
	}

	let { id, label, description, required = false, accept = '.csv', file, onchange }: Props =
		$props();

	function handleChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			onchange(input.files[0]);
		}
	}

	function clearFile() {
		onchange(null);
		const input = document.getElementById(id) as HTMLInputElement;
		if (input) input.value = '';
	}
</script>

<div class="file-upload">
	<label for={id} class="file-label">
		<span class="file-title">
			{label}
			{#if required}
				<span class="required">*</span>
			{:else}
				<span class="optional">(optional)</span>
			{/if}
		</span>
		{#if description}
			<span class="file-description">{description}</span>
		{/if}
	</label>
	<div class="file-input-wrapper">
		<input type="file" {id} {accept} onchange={handleChange} class="file-input" />
		<div class="file-display" class:has-file={file}>
			{#if file}
				<svg class="file-icon success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span class="file-name">{file.name}</span>
				<button type="button" class="clear-btn" onclick={clearFile} aria-label="Clear file">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{:else}
				<svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
				<span>Click to select or drag file here</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.file-upload {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.file-label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.file-title {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.required {
		color: var(--color-danger);
	}

	.optional {
		color: var(--color-text-muted);
		font-weight: 400;
		font-size: 0.875rem;
	}

	.file-description {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.file-input-wrapper {
		position: relative;
	}

	.file-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		z-index: 1;
	}

	.file-display {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-bg-tertiary);
		border: 2px dashed var(--color-border);
		border-radius: 8px;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.file-display:hover {
		border-color: var(--color-primary);
		background: var(--color-bg-secondary);
	}

	.file-display.has-file {
		border-color: var(--color-success);
		border-style: solid;
		color: var(--color-text-primary);
	}

	.file-icon {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}

	.file-icon.success {
		color: var(--color-success);
	}

	.file-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.clear-btn {
		position: relative;
		z-index: 2;
		width: 24px;
		height: 24px;
		padding: 0;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.clear-btn:hover {
		color: var(--color-danger);
		background: var(--color-bg-tertiary);
	}

	.clear-btn svg {
		width: 16px;
		height: 16px;
	}
</style>
