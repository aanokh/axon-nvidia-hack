CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courses (
	course_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
   	description TEXT,
   	name TEXT,
   	created_at TIMESTAMP DEFAULT NOW()
);