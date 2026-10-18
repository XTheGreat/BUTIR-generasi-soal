export interface User {
  id: string;
  nama: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Materi {
  id: string;
  guru_id: string;
  judul: string;
  file_path: string;
  created_at: string;
}

export interface KisiKisi {
  id: string;
  guru_id: string;
  jumlah_butir: number;
  distribusi_bloom: Record<string, number>;
  cakupan_bab: string | null;
  created_at: string;
}

export interface ButirSoal {
  id: string;
  kisi_kisi_id: string;
  pertanyaan: string;
  pilihan: Record<string, string>;
  kunci_jawaban: string;
  pembahasan: string;
  level_bloom: string;
  bobot_poin: number;
  status: string;
  ronde_saat_ini: number;
  prediksi_kesukaran: number | null;
  rujukan_chunk_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebatLog {
  id: string;
  butir_id: string;
  ronde: number;
  agen: string;
  output_json: Record<string, any>;
  created_at: string;
}

export interface PaketUjian {
  id: string;
  guru_id: string;
  judul: string;
  status: string;
  kode_akses: string | null;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  durasi_menit: number;
  created_at: string;
  butir_list: { butir_id: string; urutan: number }[];
}

export interface GenerationStatus {
  kisi_kisi_id: string;
  total: number;
  selesai: number;
  items: {
    id: string;
    status: string;
    level_bloom: string;
    ronde_saat_ini: number;
    pertanyaan: string;
  }[];
}

export interface SoalUjian {
  id: string;
  pertanyaan: string;
  pilihan: Record<string, string>;
  level_bloom: string;
  bobot_poin: number;
  urutan: number;
}

export interface HasilUjian {
  nama_siswa: string;
  judul_ujian: string;
  total_soal: number;
  total_benar: number;
  skor: number;
  detail: {
    butir_id: string;
    jawaban_siswa: string | null;
    kunci_jawaban: string;
    benar: boolean;
    pertanyaan: string;
  }[];
}

export interface LaporanButir {
  butir_id: string;
  pertanyaan: string;
  level_bloom: string;
  prediksi_kesukaran: number | null;
  tingkat_kesukaran_aktual: number;
  daya_beda: number;
  total_jawab: number;
  total_benar: number;
}

export interface Laporan {
  ujian_id: string;
  judul: string;
  total_peserta: number;
  analisis_butir: LaporanButir[];
}
