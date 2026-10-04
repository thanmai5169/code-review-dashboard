pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo 'Installing project dependencies...'
                bat 'npm run install-all'

                echo 'Building the client application...'
                bat 'npm run build'
            }
        }

        stage('Test/Validate') {
            steps {
                echo 'Running server tests...'
                bat 'npm test --prefix server'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker images using Docker Compose...'
                bat 'docker compose build'
            }
        }
    }

    post {
        success {
            echo 'CI Pipeline completed successfully!'
        }

        failure {
            echo 'CI Pipeline failed. Check the console output.'
        }
    }
}