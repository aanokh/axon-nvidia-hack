#TODO temporary fix for OpenGL req in S3 Loader    FROM python:3.12-slim
FROM python:3.12-slim

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y libgl1 libgl1-mesa-glx libglib2.0-0 \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

CMD ["python", "app/start.py"]
