CREATE TABLE IF NOT EXISTS places (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL,            -- 'naver' | 'kakao' | 'manual' 등
  source_place_id TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 표현식 유니크 인덱스(이름+좌표(소수7자리 반올림) 조합의 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_place_nameround
ON places (
  name,
  (round(lat::numeric, 7)),
  (round(lng::numeric, 7))
);

-- 조회 인덱스들
CREATE INDEX IF NOT EXISTS idx_places_coord ON places (lat, lng);
CREATE INDEX IF NOT EXISTS idx_places_category ON places (category);
CREATE INDEX IF NOT EXISTS idx_places_tags_gin ON places USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_places_last_updated ON places (last_updated DESC);
