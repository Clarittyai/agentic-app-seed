"""
Setup configuration for Clarity SDK
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="clarity-sdk",
    version="1.0.0",
    author="Clarity Platform",
    author_email="developers@clarity.com",
    description="Professional SDK for building AI-powered agentic applications",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/clarity-platform/clarity-sdk",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.11",
    install_requires=[
        "pydantic>=2.6.0",
        "croniter>=2.0.1",
        "pytz>=2024.1",
    ],
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.0",
            "pytest-cov>=4.1.0",
            "black>=24.1.0",
            "mypy>=1.8.0",
        ],
    },
)
