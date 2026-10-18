def select_butir_for_exam(
    butir_list: list,
    jumlah_target: int,
    distribusi_bloom: dict[str, int] | None = None,
) -> list:
    """
    Greedy selection algorithm:
    1. First, fulfill Bloom distribution requirements per category
    2. Then fill remaining quota from any available butir
    """
    selected = []
    remaining_pool = list(butir_list)

    if distribusi_bloom and jumlah_target > 0:
        bloom_targets = {}
        total_assigned = 0
        items = sorted(distribusi_bloom.items())
        for i, (level, pct) in enumerate(items):
            if i == len(items) - 1:
                count = jumlah_target - total_assigned
            else:
                count = round(jumlah_target * pct / 100)
                total_assigned += count
            if count > 0:
                bloom_targets[level] = count

        for level, count in bloom_targets.items():
            matched = [b for b in remaining_pool if b.level_bloom == level]
            picked = matched[:count]
            selected.extend(picked)
            for p in picked:
                remaining_pool.remove(p)

    remaining_needed = jumlah_target - len(selected)
    if remaining_needed > 0:
        selected.extend(remaining_pool[:remaining_needed])

    return selected
