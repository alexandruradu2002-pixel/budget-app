<script lang="ts">
	/**
	 * Date picker component with calendar view
	 */
	
	let {
		show = $bindable(false),
		value = $bindable(new Date().toISOString().split('T')[0]),
		onSelect = (date: string) => {}
	} = $props();
	
	// Calendar state
	let calendarMonth = $state(new Date().getMonth());
	let calendarYear = $state(new Date().getFullYear());
	
	const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
		'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
	
	const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
	
	// Initialize calendar when shown
	$effect(() => {
		if (show && value) {
			const [year, month] = value.split('-').map(Number);
			calendarYear = year;
			calendarMonth = month - 1;
		}
	});
	
	// Calendar helpers
	function getDaysInMonth(year: number, month: number): number {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(year: number, month: number): number {
		// Return 0 for Monday, 6 for Sunday (European week starts Monday)
		const day = new Date(year, month, 1).getDay();
		return day === 0 ? 6 : day - 1;
	}

	let calendarDays = $derived(() => {
		const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
		const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
		const days: (number | null)[] = [];
		
		// Add empty slots for days before the first day of the month
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}
		
		// Add the days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}
		
		return days;
	});

	function prevMonth() {
		if (calendarMonth === 0) {
			calendarMonth = 11;
			calendarYear--;
		} else {
			calendarMonth--;
		}
	}

	function nextMonth() {
		if (calendarMonth === 11) {
			calendarMonth = 0;
			calendarYear++;
		} else {
			calendarMonth++;
		}
	}

	function selectDate(day: number) {
		const month = String(calendarMonth + 1).padStart(2, '0');
		const dayStr = String(day).padStart(2, '0');
		value = `${calendarYear}-${month}-${dayStr}`;
		onSelect(value);
		show = false;
	}

	function isSelectedDate(day: number): boolean {
		const [year, month, dayOfMonth] = value.split('-').map(Number);
		return day === dayOfMonth && calendarMonth === month - 1 && calendarYear === year;
	}

	function isToday(day: number): boolean {
		const today = new Date();
		return day === today.getDate() && 
			calendarMonth === today.getMonth() && 
			calendarYear === today.getFullYear();
	}
	
	function closeOverlay() {
		show = false;
	}
</script>

{#if show}
	<div class="datepicker-overlay" onclick={closeOverlay} role="presentation"></div>
	<div class="datepicker">
		<div class="datepicker-header">
			<button type="button" onclick={prevMonth} class="nav-btn" aria-label="Previous month">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<span class="month-year">{monthNames[calendarMonth]} {calendarYear}</span>
			<button type="button" onclick={nextMonth} class="nav-btn" aria-label="Next month">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
		
		<div class="datepicker-days-header">
			{#each dayNames as dayName}
				<span class="day-name">{dayName}</span>
			{/each}
		</div>
		
		<div class="datepicker-days">
			{#each calendarDays() as day}
				{#if day === null}
					<span class="day-empty"></span>
				{:else}
					<button
						type="button"
						class="day-btn"
						class:selected={isSelectedDate(day)}
						class:today={isToday(day)}
						onclick={() => selectDate(day)}
					>
						{day}
					</button>
				{/if}
			{/each}
		</div>
		
		<div class="datepicker-footer">
			<button type="button" onclick={() => selectDate(new Date().getDate())} class="today-btn">
				Azi
			</button>
		</div>
	</div>
{/if}

<style>
	.datepicker-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}

	.datepicker {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 16px;
		min-width: 300px;
		z-index: 1000;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.datepicker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.nav-btn:hover {
		background: var(--color-bg-tertiary);
	}

	.nav-btn svg {
		width: 20px;
		height: 20px;
	}

	.month-year {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.datepicker-days-header {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		margin-bottom: 8px;
	}

	.day-name {
		text-align: center;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		padding: 8px 0;
	}

	.datepicker-days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}

	.day-empty {
		aspect-ratio: 1;
	}

	.day-btn {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.day-btn:hover {
		background: var(--color-bg-tertiary);
	}

	.day-btn.today {
		border: 1px solid var(--color-primary);
	}

	.day-btn.selected {
		background: var(--color-primary);
		color: white;
	}

	.datepicker-footer {
		margin-top: 12px;
		display: flex;
		justify-content: center;
	}

	.today-btn {
		padding: 8px 24px;
		border: none;
		border-radius: 8px;
		background: var(--color-bg-tertiary);
		color: var(--color-primary);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.today-btn:hover {
		background: var(--color-border);
	}
</style>
