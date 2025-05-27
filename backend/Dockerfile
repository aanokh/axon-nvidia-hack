#TODO temporary fix for OpenGL req in S3 Loader    FROM python:3.12-slim
FROM python:3.12-slim

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y libgl1 libgl1-mesa-glx libglib2.0-0 \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY requirements.txt .

#RUN pip install --no-cache-dir -r requirements.txt -c constraints.txt

RUN pip install --upgrade pip \
  && pip install --no-cache-dir arize-phoenix==7.12.3 \
  && pip install --no-cache-dir --no-deps aiqtoolkit aiqtoolkit-langchain \
  && pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

CMD ["python", "app/start.py"]
