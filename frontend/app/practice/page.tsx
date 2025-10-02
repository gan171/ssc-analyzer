"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';
import Image from 'next/image';

// Updated Mistake type to include all the new fields from your database
interface Mistake {
    id: number;
    mock_id: number;
    image_path: string;
    topic: string | null;
    notes: string | null;
    section_name: string;
    question_type: string;
    question_text: string | null;
    options: Record<string, string> | null;
    user_answer: string | null; // The original wrong answer from the mock
    correct_answer: string | null;
    difficulty: string;
    tier: string;
}

const PracticePage = () => {
    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMistakes = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/mistakes');
                if (!response.ok) {
                    throw new Error('Failed to fetch mistakes');
                }
                const data = await response.json();
                // Filter for mistakes that have the new text data
                const practiceableMistakes = data.filter((m: Mistake) => m.question_text && m.options);
                if (practiceableMistakes.length === 0) {
                    setError("No practiceable mistakes found. Please import a mock with the new scraper version.");
                } else {
                    setMistakes(practiceableMistakes);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMistakes();
    }, []);

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % mistakes.length);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + mistakes.length) % mistakes.length);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading practice session...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    }

    if (mistakes.length === 0) {
        return <div className="flex justify-center items-center h-screen">No mistakes available to practice.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Practice Mode ({currentIndex + 1} / {mistakes.length})</h1>
            <PracticeView mistake={mistakes[currentIndex]} />
            <div className="flex justify-between mt-4">
                <Button onClick={goToPrevious} disabled={mistakes.length <= 1}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button onClick={goToNext} disabled={mistakes.length <= 1}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

const PracticeView = ({ mistake }: { mistake: Mistake }) => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    // Reset state when the mistake (question) changes
    useEffect(() => {
        setSelectedOption(null);
        setIsAnswered(false);
    }, [mistake]);

    const handleCheckAnswer = () => {
        if (selectedOption) {
            setIsAnswered(true);
        }
    };
    
    // Helper to get just the label (e.g., "A") from the full answer text
    const getOptionLabel = (fullAnswer: string | null) => {
        if (!fullAnswer) return '';
        return fullAnswer.split('.')[0] || '';
    };

    const correctOptionLabel = getOptionLabel(mistake.correct_answer);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Question from {mistake.section_name} ({mistake.tier})</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="interactive">
                    <TabsList>
                        <TabsTrigger value="interactive">Interactive</TabsTrigger>
                        <TabsTrigger value="screenshot">Original Screenshot</TabsTrigger>
                    </TabsList>
                    <TabsContent value="interactive" className="mt-4">
                        <div className="mb-6">
                            <p className="whitespace-pre-wrap">{mistake.question_text}</p>
                        </div>
                        
                        <RadioGroup onValueChange={setSelectedOption} value={selectedOption || ''} disabled={isAnswered}>
                            {mistake.options && Object.entries(mistake.options).map(([key, value]) => {
                                let optionStyle = "";
                                if (isAnswered) {
                                    if (key === correctOptionLabel) {
                                        optionStyle = "bg-green-100 border-green-500 text-green-800";
                                    } else if (key === selectedOption) {
                                        optionStyle = "bg-red-100 border-red-500 text-red-800";
                                    }
                                }
                                
                                return (
                                    <div key={key} className={`flex items-center space-x-2 p-3 border rounded-md mb-2 ${optionStyle}`}>
                                        <RadioGroupItem value={key} id={key} />
                                        <Label htmlFor={key} className="flex-1">{`${key}. ${value}`}</Label>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    </TabsContent>
                    <TabsContent value="screenshot" className="mt-4">
                        <div className="relative w-full h-96">
                            <Image
                                src={`/uploads/${mistake.image_path}`}
                                alt={`Mistake screenshot for question ${mistake.id}`}
                                layout="fill"
                                objectFit="contain"
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
                {!isAnswered ? (
                    <Button onClick={handleCheckAnswer} disabled={!selectedOption}>Check Answer</Button>
                ) : (
                    <>
                        {selectedOption === correctOptionLabel ? (
                            <Alert variant="default" className="bg-green-50 border-green-200">
                                <Sparkles className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Correct!</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    Great job! You corrected your mistake.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <Lightbulb className="h-4 w-4" />
                                <AlertTitle>Not quite!</AlertTitle>
                                <AlertDescription>
                                    <div>The correct answer is: <strong>{mistake.correct_answer}</strong></div>
                                    {mistake.user_answer && <div>Your original answer was: <strong>{mistake.user_answer}</strong></div>}
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                )}
            </CardFooter>
        </Card>
    );
};

export default PracticePage;