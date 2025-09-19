@ECHO OFF
SETLOCAL

IF NOT "%JAVA_HOME%"=="" (
  SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) ELSE (
  SET "JAVA_EXE=java.exe"
)

SET WRAPPER_DIR=%~dp0\.mvn\wrapper
SET WRAPPER_JAR=%WRAPPER_DIR%\maven-wrapper.jar
SET WRAPPER_PROPERTIES=%WRAPPER_DIR%\maven-wrapper.properties

IF NOT EXIST "%WRAPPER_JAR%" (
  IF NOT EXIST "%WRAPPER_PROPERTIES%" (
    ECHO Could not find %WRAPPER_PROPERTIES%
    EXIT /B 1
  )
  FOR /F "tokens=2 delims==" %%A IN ('findstr "wrapperUrl" "%WRAPPER_PROPERTIES%"') DO SET WRAPPER_URL=%%A
  ECHO Downloading Maven wrapper jar from %WRAPPER_URL%
  powershell -Command "Invoke-WebRequest -Uri %WRAPPER_URL% -OutFile %WRAPPER_JAR%"
)

"%JAVA_EXE%" -Dmaven.multiModuleProjectDirectory=%CD% -classpath %WRAPPER_JAR% org.apache.maven.wrapper.MavenWrapperMain %*
