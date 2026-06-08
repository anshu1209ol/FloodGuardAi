# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Create a non-root user with UID 1000 (Hugging Face requirement)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Set the working directory in the container
WORKDIR /code

# Copy requirements and install dependencies
COPY --chown=user backend/requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy backend folder contents into /code
COPY --chown=user backend/ /code/

# Expose port 7860 (Hugging Face Spaces requirement)
EXPOSE 7860

# Run uvicorn on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
