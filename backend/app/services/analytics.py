import math


def hitung_tingkat_kesukaran(jawaban_benar: int, total_peserta: int) -> float:
    """Proportion of students who answered correctly."""
    if total_peserta == 0:
        return 0.0
    return round(jawaban_benar / total_peserta, 4)


def hitung_daya_beda(
    skor_total_per_siswa: list[tuple[str, float]],
    jawaban_per_butir: dict[str, bool],
) -> float:
    """
    Discrimination index using upper-lower 27% method.
    skor_total_per_siswa: list of (nama_siswa, total_score)
    jawaban_per_butir: dict of {nama_siswa: benar}
    """
    if len(skor_total_per_siswa) < 4:
        return 0.0

    sorted_siswa = sorted(skor_total_per_siswa, key=lambda x: x[1], reverse=True)
    n = len(sorted_siswa)
    group_size = max(1, math.ceil(n * 0.27))

    upper_group = [s[0] for s in sorted_siswa[:group_size]]
    lower_group = [s[0] for s in sorted_siswa[-group_size:]]

    upper_correct = sum(1 for nama in upper_group if jawaban_per_butir.get(nama, False))
    lower_correct = sum(1 for nama in lower_group if jawaban_per_butir.get(nama, False))

    daya_beda = (upper_correct - lower_correct) / group_size
    return round(daya_beda, 4)
